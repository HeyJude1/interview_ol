package interview.guide.infrastructure.redis;

import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewSessionDTO.SessionStatus;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.Serializable;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * 面试会话 Redis 缓存服务
 * 管理面试会话在 Redis 中的存储
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewSessionCache {

    private final RedisService redisService;
    private final ObjectMapper objectMapper;

    /**
     * 缓存键前缀
     */
    private static final String SESSION_KEY_PREFIX = "interview:session:";

    /**
     * 简历ID到会话ID的映射前缀（用于查找未完成会话）
     */
    private static final String RESUME_SESSION_KEY_PREFIX = "interview:resume:";

    /**
     * 会话默认过期时间（24小时）
     */
    private static final Duration SESSION_TTL = Duration.ofHours(24);

    /**
     * 缓存的会话数据
     * 主要是去构建这么一个缓存的数据结构,JSON格式的
     */
    @Data
    public static class CachedSession implements Serializable {
        // 会话ID
        private String sessionId;
        // 简历内容
        private String resumeText;
        // 简历ID
        private Long resumeId;
        // 问题列表
        private String questionsJson;  // 序列化的问题列表
        // 当前问题索引
        private int currentIndex;
        // 会话状态
        private SessionStatus status;

        public CachedSession() {
        }

        public CachedSession(String sessionId, String resumeText, Long resumeId,
                            List<InterviewQuestionDTO> questions, int currentIndex,
                            SessionStatus status, ObjectMapper objectMapper) {
            this.sessionId = sessionId;
            this.resumeText = resumeText;
            this.resumeId = resumeId;
            this.currentIndex = currentIndex;
            this.status = status;
            try {
                // 将问题列表序列化为JSON字符串
                this.questionsJson = objectMapper.writeValueAsString(questions);
            } catch (JacksonException e) {
                throw new RuntimeException("序列化问题列表失败", e);
            }
        }

        public List<InterviewQuestionDTO> getQuestions(ObjectMapper objectMapper) {
            try {
                // 将JSON字符串反序列化为问题列表
                // objectMapper.readValue(questionsJson, List.class);会报错
                return objectMapper.readValue(questionsJson, new TypeReference<>() {});
            } catch (JacksonException e) {
                throw new RuntimeException("反序列化问题列表失败", e);
            }
        }
    }

    /**
     * 保存会话到缓存
     * @param sessionId 会话ID
     * @param resumeText 简历内容
     * @param resumeId 简历ID
     * @param questions 问题列表
     * @param currentIndex 当前问题索引
     * @param status 会话状态
     */
    public void saveSession(String sessionId, String resumeText, Long resumeId,
                           List<InterviewQuestionDTO> questions, int currentIndex,
                           SessionStatus status) {
        // 保存会话的时候需要有一个唯一的标识符
        String key = buildSessionKey(sessionId);
        CachedSession cachedSession = new CachedSession(
            sessionId, resumeText, resumeId, questions, currentIndex, status, objectMapper
        );

        // 保存的结构大概是：
        // interview:session:{sessionId} value=CachedSession TTL=SESSION_TTL
        // 可以拿到会话的完整状态（简历内容、题目列表、currentIndex、status 等），从中恢复断点继续答题。
        redisService.set(key, cachedSession, SESSION_TTL);

        // 如果有 resumeId，建立映射关系（用于查找未完成会话）
        if (resumeId != null && isUnfinishedStatus(status)) {
            // interview:resume:{resumeId} value=sessionId TTL=SESSION_TTL
            // 可以用简历 ID 快速查到“当前这份简历有没有未完成的会话”
            // Optional<String> findUnfinishedSessionId(Long resumeId)  +   Optional<CachedSession> getSession(sessionId)
            saveResumeSessionMapping(resumeId, sessionId);
        }

        log.debug("会话已缓存: sessionId={}, resumeId={}, status={}", sessionId, resumeId, status);
    }

    /**
     * 获取缓存的会话
     * 方便更新会话
     */
    public Optional<CachedSession> getSession(String sessionId) {
        String key = buildSessionKey(sessionId);
        CachedSession session = redisService.get(key);
        if (session != null) {
            log.debug("从缓存获取会话: sessionId={}", sessionId);
            return Optional.of(session);
        }
        return Optional.empty();
    }

    /**
     * 更新会话状态
     * 整个方法的思路:根据sessionId获取会话，更新会话状态，然后重新保存到Redis中
     */
    public void updateSessionStatus(String sessionId, SessionStatus status) {
        getSession(sessionId).ifPresent(session -> {
            session.setStatus(status);
            // 其实就是将sessionID复杂化能够作为唯一标识符
            String key = buildSessionKey(sessionId);
            // RedissonClient.set() 方法会自动处理序列化和过期时间
            // 这里其实是覆盖了一下这个key的值
            redisService.set(key, session, SESSION_TTL);

            // 如果会话已完成，移除映射
            if (!isUnfinishedStatus(status) && session.getResumeId() != null) {
                // 移除简历到会话的映射,确保简历和会话的一对一关系
                removeResumeSessionMapping(session.getResumeId(), sessionId);
            }

            log.debug("更新会话状态: sessionId={}, status={}", sessionId, status);
        });
    }

    /**
     * 更新当前问题索引
     * @param sessionId 会话ID
     * @param currentIndex 更新后的问题索引
     */
    public void updateCurrentIndex(String sessionId, int currentIndex) {
        getSession(sessionId).ifPresent(session -> {
            session.setCurrentIndex(currentIndex);
            String key = buildSessionKey(sessionId);
            redisService.set(key, session, SESSION_TTL);
            log.debug("更新会话进度: sessionId={}, currentIndex={}", sessionId, currentIndex);
        });
    }

    /**
     * 更新问题列表（用于保存答案）
     */
    public void updateQuestions(String sessionId, List<InterviewQuestionDTO> questions) {
        getSession(sessionId).ifPresent(session -> {
            try {
                session.setQuestionsJson(objectMapper.writeValueAsString(questions));
                String key = buildSessionKey(sessionId);
                redisService.set(key, session, SESSION_TTL);
                log.debug("更新会话问题: sessionId={}", sessionId);
            } catch (JacksonException e) {
                log.error("序列化问题列表失败", e);
            }
        });
    }

    /**
     * 删除会话缓存
     */
    public void deleteSession(String sessionId) {
        getSession(sessionId).ifPresent(session -> {
            if (session.getResumeId() != null) {
                removeResumeSessionMapping(session.getResumeId(), sessionId);
            }
        });

        String key = buildSessionKey(sessionId);
        redisService.delete(key);
        log.debug("删除会话缓存: sessionId={}", sessionId);
    }

    /**
     * 根据简历ID查找未完成的会话ID
     */
    public Optional<String> findUnfinishedSessionId(Long resumeId) {
        String key = buildResumeSessionKey(resumeId);
        // 用resumeID为基础构建的key来查找
        // 因为redis中存有<resumeId得到的key,sessionId>这样的映射
        String sessionId = redisService.get(key);
        if (sessionId != null) {
            // 验证会话是否仍然存在且未完成
            // fetSession做的其实跟上面拿key找值的操作一样的事,因为redis中存有<sessionId得到的key,CachedSession>这样的映射
            Optional<CachedSession> sessionOpt = getSession(sessionId);
            // Optional.isPresent()方法判断是否存在,也就是是否不为空
            // Optional.get()方法得到Optional<CachedSession>中的CachedSession对象
            // CachedSession类有@Data注解,所以有对应的getter、setter方法,所以取出来的CachedSession对象有getStatus()方法
            if (sessionOpt.isPresent() && isUnfinishedStatus(sessionOpt.get().getStatus())) {
                // 如果会话存在且状态未完成,返回会话ID
                // 用Optional.of()包装sessionId,表示返回一个Optional对象,后续可以看看这个对象是否为空,来判断此次是否找到了未完成的会话
                return Optional.of(sessionId);
            } else {
                // 会话已不存在或已完成，清理映射
                redisService.delete(key);
            }
        }
        // 没有找到未完成的会话,返回空的Optional对象
        return Optional.empty();
    }

    /**
     * 刷新会话过期时间
     */
    public void refreshSessionTTL(String sessionId) {
        String key = buildSessionKey(sessionId);
        redisService.expire(key, SESSION_TTL);
    }

    /**
     * 检查会话是否在缓存中
     */
    public boolean exists(String sessionId) {
        String key = buildSessionKey(sessionId);
        return redisService.exists(key);
    }

    // ==================== 私有方法 ====================

    private String buildSessionKey(String sessionId) {
        return SESSION_KEY_PREFIX + sessionId;
    }

    private String buildResumeSessionKey(Long resumeId) {
        return RESUME_SESSION_KEY_PREFIX + resumeId;
    }

    private void saveResumeSessionMapping(Long resumeId, String sessionId) {
        String key = buildResumeSessionKey(resumeId);
        redisService.set(key, sessionId, SESSION_TTL);
    }

    private void removeResumeSessionMapping(Long resumeId, String sessionId) {
        String key = buildResumeSessionKey(resumeId);
        String currentSessionId = redisService.get(key);
        // 只有当前映射的是这个 sessionId 时才删除
        if (sessionId.equals(currentSessionId)) {
            redisService.delete(key);
        }
    }

    private boolean isUnfinishedStatus(SessionStatus status) {
        return status == SessionStatus.CREATED || status == SessionStatus.IN_PROGRESS;
    }
}

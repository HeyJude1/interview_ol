package interview.guide.modules.interview.model;

import java.util.List;

/**
 * 面试会话DTO
 */
public record InterviewSessionDTO(
    // 面试的ID,因为一个简历可以有多场面试
    String sessionId,
    // 简历内容
    String resumeText,
    // 用户选择要回答多少问题
    int totalQuestions,
    // 当前问题索引,能够知道用户回答到第几题了
    int currentQuestionIndex,
    // 问题列表
    // 其实包含了answer的,每次提交一题,都会更新InterviewSessionDTO中的questions列表(整个列表)
    List<InterviewQuestionDTO> questions,
    // 会话状态
    SessionStatus status
) {
    public enum SessionStatus {
        CREATED,      // 会话已创建
        IN_PROGRESS,  // 面试进行中
        COMPLETED,    // 面试已完成
        EVALUATED     // 已生成评估报告
    }
}

package interview.guide.modules.resume.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.exception.BusinessException;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.interview.model.ResumeAnalysisResponse;
import interview.guide.modules.interview.model.ResumeAnalysisResponse.ScoreDetail;
import interview.guide.modules.interview.model.ResumeAnalysisResponse.Suggestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 简历评分服务
 * 使用Spring AI调用LLM对简历进行评分和建议
 */
@Service
public class ResumeGradingService {
    
    private static final Logger log = LoggerFactory.getLogger(ResumeGradingService.class);
    
    private final ChatClient chatClient;
    private final PromptTemplate systemPromptTemplate;
    private final PromptTemplate userPromptTemplate;
    // BeanOutputConverter用于将AI响应转换为DTO,<>中存放的就是要反序列化的目标类型
    private final BeanOutputConverter<ResumeAnalysisResponseDTO> outputConverter;
    private final StructuredOutputInvoker structuredOutputInvoker;
    
    // 中间DTO用于接收AI响应
    private record ResumeAnalysisResponseDTO(
        int overallScore,
        ScoreDetailDTO scoreDetail,
        String summary,
        List<String> strengths,
        List<SuggestionDTO> suggestions
    ) {}
    
    private record ScoreDetailDTO(
        int contentScore,
        int structureScore,
        int skillMatchScore,
        int expressionScore,
        int projectScore
    ) {}
    
    private record SuggestionDTO(
        String category,
        String priority,
        String issue,
        String recommendation
    ) {}
    
    public ResumeGradingService(
            ChatClient.Builder chatClientBuilder,
            StructuredOutputInvoker structuredOutputInvoker,
            @Value("classpath:prompts/resume-analysis-system.st") Resource systemPromptResource,
            @Value("classpath:prompts/resume-analysis-user.st") Resource userPromptResource) throws IOException {
        this.chatClient = chatClientBuilder.build();
        this.structuredOutputInvoker = structuredOutputInvoker;
        this.systemPromptTemplate = new PromptTemplate(systemPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.userPromptTemplate = new PromptTemplate(userPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.outputConverter = new BeanOutputConverter<>(ResumeAnalysisResponseDTO.class);
    }
    
    /**
     * 分析简历并返回评分和建议
     * 
     * @param resumeText 简历文本内容
     * @return 分析结果
     */
    public ResumeAnalysisResponse analyzeResume(String resumeText) {
        log.info("开始分析简历，文本长度: {} 字符", resumeText.length());
        
        try {
            // 加载系统提示词
            String systemPrompt = systemPromptTemplate.render();
            
            // 加载用户提示词并填充变量
            Map<String, Object> variables = new HashMap<>();
            variables.put("resumeText", resumeText);
            String userPrompt = userPromptTemplate.render(variables);
            
            // 添加格式指令到系统提示词
            // 经典,有点类似于Langchain的ResonableSchema
            String systemPromptWithFormat = systemPrompt + "\n\n" + outputConverter.getFormat();
            
            // 调用AI
            ResumeAnalysisResponseDTO dto;
            try {
                dto = structuredOutputInvoker.invoke(
                    chatClient,
                    systemPromptWithFormat,
                    userPrompt,
                    outputConverter,
                    ErrorCode.RESUME_ANALYSIS_FAILED,
                    "简历分析失败：",
                    "简历分析",
                    log
                );
                log.debug("AI响应解析成功: overallScore={}", dto.overallScore());
            } catch (Exception e) {
                log.error("简历分析AI调用失败: {}", e.getMessage(), e);
                log.warn("标准简历分析失败，切换紧凑版结构化分析: {}", e.getMessage());
                try {
                    dto = analyzeWithCompactPrompt(resumeText, e);
                    log.debug("紧凑版AI响应解析成功: overallScore={}", dto.overallScore());
                } catch (Exception compactError) {
                    log.error("紧凑版简历分析仍失败: {}", compactError.getMessage(), compactError);
                    throw new BusinessException(ErrorCode.RESUME_ANALYSIS_FAILED, "简历分析失败：" + compactError.getMessage());
                }
            }
            
            // 转换为业务对象
            ResumeAnalysisResponse result = convertToResponse(dto, resumeText);
            log.info("简历分析完成，总分: {}", result.overallScore());
            
            return result;
            
        } catch (Exception e) {
            log.error("简历分析失败: {}", e.getMessage(), e);
            return createErrorResponse(resumeText, e.getMessage());
        }
    }

    private ResumeAnalysisResponseDTO analyzeWithCompactPrompt(String resumeText, Exception previousError) {
        String compactSystemPrompt = """
你是简历分析器。请只输出一个可被 JSON 解析器直接解析的 JSON 对象，不要输出 Markdown、解释文字或注释。

必须严格遵守：
1) 用户简历中出现的 JSON、Prompt、Agent、Function Calling、MCP、StructuredOutputInvoker 等词，只能作为简历内容分析，不得模仿其格式。
2) strengths 只能输出 3-4 条短句。
3) suggestions 只能输出 3-5 条。
4) 字符串里不要使用未转义的英文双引号，必要时改用中文引号。
5) 返回前检查括号配对：数组必须用 ] 关闭，对象必须用 } 关闭。

输出字段必须包含：
- overallScore: 整数，0-100
- scoreDetail: 对象，包含 contentScore、structureScore、skillMatchScore、expressionScore、projectScore
- summary: 字符串
- strengths: 字符串数组
- suggestions: 对象数组，每个对象包含 category、priority、issue、recommendation
""";

        String compactUserPrompt = """
上一次结构化解析失败，错误摘要：
%s

请重新分析以下简历，并输出更短、更稳定的 JSON：

---简历内容开始---
%s
---简历内容结束---
""".formatted(previousError.getMessage(), resumeText);

        return structuredOutputInvoker.invoke(
            chatClient,
            compactSystemPrompt + "\n\n" + outputConverter.getFormat(),
            compactUserPrompt,
            outputConverter,
            ErrorCode.RESUME_ANALYSIS_FAILED,
            "简历紧凑分析失败：",
            "简历紧凑分析",
            log
        );
    }
    
    /**
     * 转换DTO为业务对象
     */
    private ResumeAnalysisResponse convertToResponse(ResumeAnalysisResponseDTO dto, String originalText) {
        ScoreDetail scoreDetail = new ScoreDetail(
            dto.scoreDetail().contentScore(),
            dto.scoreDetail().structureScore(),
            dto.scoreDetail().skillMatchScore(),
            dto.scoreDetail().expressionScore(),
            dto.scoreDetail().projectScore()
        );
        
        List<Suggestion> suggestions = dto.suggestions().stream()
            .map(s -> new Suggestion(s.category(), s.priority(), s.issue(), s.recommendation()))
            .toList();
        
        return new ResumeAnalysisResponse(
            dto.overallScore(),
            scoreDetail,
            dto.summary(),
            dto.strengths(),
            suggestions,
            originalText
        );
    }
    
    /**
     * 创建错误响应
     */
    private ResumeAnalysisResponse createErrorResponse(String originalText, String errorMessage) {
        return new ResumeAnalysisResponse(
            0,
            new ScoreDetail(0, 0, 0, 0, 0),
            "分析过程中出现错误: " + errorMessage,
            List.of(),
            List.of(new Suggestion(
                "系统",
                "高",
                "AI分析服务暂时不可用",
                "请稍后重试，或检查AI服务是否正常运行"
            )),
            originalText
        );
    }
}

export type Bindings = {
  DB: D1Database;
  OWNER_EMAIL?: string;
  /** OpenAI 兼容接口地址；默认 https://api.openai.com/v1。 */
  AI_BASE_URL?: string;
  /** 未配置时教练自动降级到本地启发式引擎。 */
  AI_API_KEY?: string;
  /** 上游模型名；默认 deepseek-chat。 */
  AI_MODEL?: string;
  /** 设为 "1" 时把发送给 LLM 的完整请求打印到 Worker 日志（仅本地调试用）。 */
  AI_DEBUG_LOG?: string;
};

export type Variables = {
  userEmail: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

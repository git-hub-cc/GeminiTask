// ask.js
import { GoogleGenAI } from "@google/genai";

// 确保 GEMINI_API_KEY 环境变量已设置
// SDK 会自动查找 process.env.GEMINI_API_KEY
// 会话
// $env:GEMINI_API_KEY="AIzaSy...你的真实Key...XyZ"
// 系统
// setx GEMINI_API_KEY "AIzaSy...你的真实Key...XyZ"
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("错误: GEMINI_API_KEY 环境变量未设置。请先设置您的 API Key。");
    process.exit(1);
}

// 初始化 GoogleGenAI 客户端
const ai = new GoogleGenAI({ apiKey });

/**
 * 使用 Gemini 模型生成内容
 * @param {string} prompt 要发送给模型的提示词
 */
async function run(prompt) {
    console.log(`正在向 Gemini 发送提示词: "${prompt}"`);

    try {
        // 使用 generateContent 方法，指定模型
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // 推荐使用最新的 flash 模型，速度快且成本低
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
        });

        // 提取并打印模型的响应文本
        const text = response.text;

        console.log("\n--- AI 响应 ---");
        console.log(text);
        console.log("-----------------");

    } catch (error) {
        console.error("\n调用 Gemini API 失败:");
        console.error(error.message);
    }
}

// 要提问的问题
const myPrompt = "用中文解释为什么太阳看起来是黄色的，但实际上是白色的。";

run(myPrompt);
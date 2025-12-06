import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// 1. 检查 API Key
const apiKey = process.env.GEMINI_API_KEY;
// 会话
// $env:GEMINI_API_KEY="AIzaSy...你的真实Key...XyZ"
// 系统
// setx GEMINI_API_KEY "AIzaSy...你的真实Key...XyZ"
// $env:GEMINI_API_KEY
if (!apiKey) {
    console.error("错误: GEMINI_API_KEY 环境变量未设置。");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

/**
 * 打印请求报文的辅助函数。
 * 为了避免打印过长的 base64 字符串，会将其截断显示。
 * @param {object} payload - 要发送给 API 的请求对象
 */
function logRequestPayload(payload) {
    const loggablePayload = JSON.parse(JSON.stringify(payload));

    if (loggablePayload.contents) {
        for (const content of loggablePayload.contents) {
            if (content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        const data = part.inlineData.data;
                        part.inlineData.data = `[Base64 数据已省略, 长度: ${data.length}, 预览: ${data.substring(0, 20)}...${data.substring(data.length - 20)}]`;
                    }
                }
            }
        }
    }

    console.log(JSON.stringify(loggablePayload, null, 2));
}


// 2. 音频处理函数
function getAudioPart(filePath) {
    try {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`文件不存在: ${absolutePath}`);
        }

        const stats = fs.statSync(absolutePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
        console.log(`音频文件大小: ${fileSizeInMegabytes.toFixed(2)} MB`);

        if (fileSizeInMegabytes > 18) {
            console.warn("警告：文件接近或超过 20MB 限制，可能会导致请求失败。");
        }

        const fileBuffer = fs.readFileSync(absolutePath);
        const base64Data = fileBuffer.toString('base64');

        return {
            inlineData: {
                mimeType: "audio/mp3",
                data: base64Data
            }
        };
    } catch (error) {
        console.error("读取音频失败:", error.message);
        process.exit(1);
    }
}

const PROMPT_ROUND_1 = `
识别文字后转化为笔记，格式为：
词根（可能无）
单词1 单词1翻译
例句1
补充笔记1

单词2 单词2翻译
例句2
补充笔记2
`;

// MOD: 第二轮请求不再需要，因此注释掉 PROMPT_ROUND_2
// const PROMPT_ROUND_2 = `
// 对缺乏例句的进行补充，将例句错误进行改正，输出改正后和补充后的句子，保持原来的格式。
// `;

async function run() {
    const audioFilePath = process.argv[2];

    if (!audioFilePath) {
        console.error("错误: 请提供一个音频文件路径作为参数。");
        console.error("用法: node 01geminiProcessor.js <文件路径>");
        process.exit(1);
    }
    console.log(`正在处理文件: ${audioFilePath}`);

    const audioPart = getAudioPart(audioFilePath);

    const contentsForRound1 = [
        {
            role: "user",
            parts: [
                audioPart,
                { text: PROMPT_ROUND_1 }
            ]
        }
    ];

    console.log("\n=== 正在上传音频并生成笔记 (请耐心等待)... ==="); // MOD: 简化了日志输出

    try {
        const requestPayload1 = {
            model: 'gemini-2.5-pro',
            contents: contentsForRound1,
            config: {}
        };
        console.log("\n[DEBUG] 发送至 Gemini API 的请求报文:");
        logRequestPayload(requestPayload1);

        const response1 = await ai.models.generateContent(requestPayload1);

        const text1 = response1.text;
        console.log("\n--- 生成结果 ---"); // MOD: 简化了日志输出
        console.log(text1);

        // MOD: 将文件写入操作移到这里，并直接使用第一次请求的结果 (text1)
        const outputFilePath = path.join(
            path.dirname(audioFilePath),
            path.basename(audioFilePath, path.extname(audioFilePath)) + ".md"
        );

        fs.writeFileSync(outputFilePath, text1, 'utf8');

        console.log(`\n✅ 笔记已成功保存到: ${outputFilePath}`);


        // MOD: 删除了整个第二轮请求的代码块
        /*
        // --- START: 关键修改 ---
        // 不再将第一轮结果推入历史记录，因为第二轮是独立请求
        // chatHistory.push({
        //     role: "model",
        //     parts: [{ text: text1 }]
        // });
        // --- END: 关键修改 ---

        console.log("\n\n=== 第二轮请求: 正在修正与补充... ===");

        // --- START: 关键修改 ---
        // 不再向 chatHistory 推送，而是构建一个全新的、独立的请求体
        // chatHistory.push({
        //     role: "user",
        //     parts: [{ text: PROMPT_ROUND_2 }]
        // });

        // 创建一个全新的、独立的请求内容，仅包含第一轮的结果和第二轮的指令。
        const contentsForRound2 = [{
            role: "user",
            parts: [
                // 将第一轮的结果和第二轮的提示合并为一个清晰的指令，效果更好
                { text: `这是需要处理的笔记文本：\n\n${text1}\n\n---\n\n请遵循以下指令处理上述文本：\n${PROMPT_ROUND_2}` }
            ]
        }];
        // --- END: 关键修改 ---

        try {
            const requestPayload2 = {
                model: 'gemini-2.5-pro',
                // --- START: 关键修改 ---
                contents: contentsForRound2, // 使用为第二轮新构建的 contents
                // --- END: 关键修改 ---
            };
            console.log("\n[DEBUG] 发送至 Gemini API 的第二轮请求报文:");
            logRequestPayload(requestPayload2);

            const response2 = await ai.models.generateContent(requestPayload2);

            const finalContent = response2.text;
            console.log("\n--- 最终结果 ---");
            console.log(finalContent);

            const outputFilePath = path.join(
                path.dirname(audioFilePath),
                path.basename(audioFilePath, path.extname(audioFilePath)) + ".md"
            );

            fs.writeFileSync(outputFilePath, finalContent, 'utf8');

            console.log(`\n✅ 笔记已成功保存到: ${outputFilePath}`);

        } catch (error) {
            console.error("\n!!! 第二轮请求失败 !!!");
            console.error("错误详情:", error);
        }
        */

    } catch (error) {
        console.error("\n!!! 请求失败 !!!"); // MOD: 简化了日志输出
        console.error("错误详情:", error);
        console.error("建议：请检查 VPN 是否开启了‘全局模式’或‘TUN模式’。");
        return;
    }
}

run();
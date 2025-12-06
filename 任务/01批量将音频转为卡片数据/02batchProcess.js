// runAll.js

/**
 * 批量处理脚本
 *
 * 功能:
 * 1. 自动扫描当前目录及其所有子目录，查找所有的 ".opus" 文件。
 * 2. 顺序执行 `01geminiProcessor.js` 脚本来处理每一个找到的音频文件。
 * 3. 实时将 `01geminiProcessor.js` 的所有日志输出（包括进度、成功信息和错误）打印到当前控制台。
 * 4. 在每次处理文件之间增加 5 秒的等待时间，以避免 API 请求过于频繁。
 *
 * 使用前置条件:
 * 1. 将此脚本 (`runAll.js`) 与 `01geminiProcessor.js` 放置在同一个项目根目录下。
 * 2. 确保已安装 Node.js 环境。
 * 3. 在终端中运行 `npm install glob` 来安装依赖。
 *
 * 如何运行:
 * 在终端中，导航到项目根目录，然后执行 `node runAll.js`
 */

import { spawn } from 'child_process';
import { glob } from 'glob';
import path from 'path';

// 定义要执行的目标脚本名称
const TARGET_SCRIPT = '01geminiProcessor.js';

// MOD: 新增一个延时函数，返回一个在指定毫秒后 resolve 的 Promise
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 使用子进程执行指定的脚本来处理单个文件。
 * @param {string} filePath - 要处理的 opus 文件的绝对路径。
 * @returns {Promise<void>} - 当子进程成功完成时 resolve，失败时 reject。
 */
function processFile(filePath) {
    return new Promise((resolve, reject) => {
        // 使用 spawn 启动一个子进程。'node' 是命令，后面是参数数组。
        // spawn 优于 exec，因为它能实时处理数据流，适合捕获长时间运行任务的日志。
        const childProcess = spawn('node', [TARGET_SCRIPT, filePath]);

        // 监听子进程的标准输出流 (stdout)
        // 每当子进程打印日志时，此事件就会被触发。
        childProcess.stdout.on('data', (data) => {
            // 将子进程的输出直接写入到当前进程的标准输出，实现日志实时透传。
            process.stdout.write(data);
        });

        // 监听子进程的标准错误流 (stderr)
        // 当子进程输出错误信息时（例如 console.error），此事件被触发。
        childProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });

        // 监听进程启动或执行过程中的原生错误（例如找不到 'node' 命令）
        childProcess.on('error', (error) => {
            console.error(`\n❌ 启动子进程时发生致命错误: ${error.message}`);
            reject(error);
        });

        // 监听子进程的退出事件
        childProcess.on('close', (code) => {
            if (code === 0) {
                // 退出码为 0 通常表示成功
                resolve();
            } else {
                // 非 0 退出码表示发生了错误
                reject(new Error(`子进程以错误码 ${code} 退出。`));
            }
        });
    });
}

/**
 * 脚本主函数，负责查找文件并按顺序处理。
 */
async function main() {
    console.log("🚀 开始批量处理任务...");

    try {
        // 使用 glob 异步查找所有符合 '**/*.opus' 模式的文件。
        // '**' 匹配任意层级的目录。
        // `path.resolve` 确保我们得到的是绝对路径，避免子进程中的路径问题。
        const opusFiles = await glob('**/*.opus', {
            ignore: 'node_modules/**', // 忽略 node_modules 目录以提高性能
            absolute: true, // 返回绝对路径
        });

        if (opusFiles.length === 0) {
            console.warn("🟡 未在当前目录及子目录中找到任何 .opus 文件。");
            return;
        }

        console.log(`🔍 共找到 ${opusFiles.length} 个 .opus 文件待处理。\n`);

        let successCount = 0;
        let failureCount = 0;

        // 使用 for...of 循环来确保文件被顺序处理。
        // forEach 配合 async/await 无法实现顺序等待。
        for (const [index, file] of opusFiles.entries()) {
            const fileIdentifier = `[${index + 1}/${opusFiles.length}]`;
            console.log("======================================================================");
            console.log(`▶️  ${fileIdentifier} 开始处理文件: ${path.basename(file)}`);
            console.log(`   路径: ${file}`);
            console.log("----------------------------------------------------------------------");

            try {
                // 等待当前文件处理完成
                await processFile(file);
                console.log(`\n✅ ${fileIdentifier} 文件处理成功: ${path.basename(file)}`);
                successCount++;
            } catch (error) {
                // 如果 processFile reject，捕获错误
                console.error(`\n❌ ${fileIdentifier} 文件处理失败: ${path.basename(file)}`);
                console.error(`   错误详情: ${error.message}`);
                console.log("   脚本将继续处理下一个文件...");
                failureCount++;
            }
            console.log("======================================================================\n");

            // --- START: MOD ---
            // 在处理完一个文件后，检查是否是最后一个文件
            // 如果不是最后一个，则等待5秒
            if (index < opusFiles.length - 1) {
                console.log(`⏳ 等待 5 秒后继续处理下一个文件...`);
                await delay(5000); // 等待 5000 毫秒
                console.log(); // 打印一个空行以分隔输出
            }
            // --- END: MOD ---
        }

        // 任务总结
        console.log("🏁 所有任务已完成。");
        console.log(`   - 成功: ${successCount} 个`);
        console.log(`   - 失败: ${failureCount} 个`);

    } catch (error) {
        console.error("💥 运行主程序时发生严重错误:", error);
    }
}

// 启动主程序
main();
import subprocess
import os
import sys
import multiprocessing

# ====================================================================
#  可配置参数 (与原版相同)
# ====================================================================
AUDIO_BITRATE = '24k'
OPUS_APPLICATION = 'voip'
OUTPUT_EXTENSION = '.opus'
# ====================================================================

def process_video_file(input_mp4_path):
    """
    将单个 MP4 文件转换为一个高质量、小体积的 Opus 音频文件。
    (这个函数几乎不变，只是为了并行化，打印信息稍作调整)
    """
    thread_name = multiprocessing.current_process().name
    print(f"[{thread_name}] ▶️  开始处理: {os.path.basename(input_mp4_path)}")

    output_audio_path = os.path.splitext(input_mp4_path)[0] + OUTPUT_EXTENSION

    ffmpeg_command = [
        'ffmpeg',
        '-i', input_mp4_path,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', AUDIO_BITRATE,
        '-application', OPUS_APPLICATION,
        '-y',
        output_audio_path
    ]

    try:
        # 使用 DEVNULL 隐藏 ffmpeg 的详细进度输出
        subprocess.run(
            ffmpeg_command,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        file_size_mb = os.path.getsize(output_audio_path) / (1024 * 1024)
        print(f"[{thread_name}] ✅ 处理成功: {os.path.basename(output_audio_path)} ({file_size_mb:.2f} MB)")
        return True # 返回成功状态
    except subprocess.CalledProcessError:
        print(f"[{thread_name}] ❌ FFmpeg 执行失败: {os.path.basename(input_mp4_path)}")
        return False # 返回失败状态
    except Exception as e:
        print(f"[{thread_name}] ❌ 发生未知错误处理 {os.path.basename(input_mp4_path)}: {e}")
        return False


# ====================================================================
# 主执行逻辑
# ====================================================================

if __name__ == "__main__":
    # 检查 ffmpeg 是否可用 (与原版相同)
    try:
        subprocess.run(['ffmpeg', '-version'], check=True, capture_output=True)
        print("'ffmpeg' 已找到。")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("==============================================")
        print("❌ 错误: 找不到 'ffmpeg' 命令。")
        print("   请确保 FFmpeg 已被正确安装并添加到了系统的 PATH 环境变量中。")
        print("==============================================")
        sys.exit(1)

    start_dir = "."
    if len(sys.argv) > 1:
        start_dir = sys.argv[1]

    abs_start_dir = os.path.abspath(start_dir)
    print(f"\n将在目录 '{abs_start_dir}' 中搜索 MP4 文件...")
    print(f"输出格式: Opus ({OUTPUT_EXTENSION})")
    print(f"音频比特率: {AUDIO_BITRATE}")
    print(f"优化模式: {OPUS_APPLICATION} (语音)")

    mp4_files = []
    for dirpath, _, filenames in os.walk(abs_start_dir):
        for filename in filenames:
            if filename.lower().endswith(".mp4"):
                mp4_files.append(os.path.join(dirpath, filename))

    if not mp4_files:
        print("\n未找到任何 .mp4 文件。")
        sys.exit(0)

    print(f"\n共找到 {len(mp4_files)} 个 .mp4 文件待处理。")

    # ====================================================================
    #  核心优化：使用多进程并行处理
    # ====================================================================
    # 获取 CPU 核心数，以便充分利用
    num_processes = multiprocessing.cpu_count()
    print(f"将使用 {num_processes} 个 CPU 核心进行并行处理...")

    # 创建一个进程池
    with multiprocessing.Pool(processes=num_processes) as pool:
        # map 函数会将 mp4_files 列表中的每一项分配给一个进程去执行 process_video_file 函数
        # 它会自动处理任务分发和结果收集
        results = pool.map(process_video_file, mp4_files)

    # 统计成功和失败的次数
    successful_videos = sum(1 for r in results if r is True)

    print("\n======================================================================")
    print("🎉 批量处理全部完成。")
    print(f"总共处理的视频文件数: {len(mp4_files)}")
    print(f"成功生成的音频文件数: {successful_videos}")
    print("======================================================================")
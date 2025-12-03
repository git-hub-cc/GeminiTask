import cairosvg
import os

def convert_svg_to_pngs(svg_file, output_sizes):
    """
    将一个 SVG 文件转换为多个指定尺寸的 PNG 文件。

    参数:
    svg_file (str): 输入的 SVG 文件路径。
    output_sizes (list): 一个包含所需尺寸（整数）的列表。
    """
    # 检查输入文件是否存在
    if not os.path.exists(svg_file):
        print(f"错误：找不到输入文件 '{svg_file}'")
        return

    # 从输入文件名中获取基本名称 (例如 'icon.svg' -> 'icon')
    base_name = os.path.splitext(svg_file)[0]

    print(f"开始转换 '{svg_file}'...")

    # 循环遍历所有需要生成的尺寸
    for size in output_sizes:
        # 构建输出文件名，例如 'icon16.png'
        output_png = f"{base_name}{size}.png"

        try:
            # 使用 cairosvg 进行转换
            # url: 输入文件路径
            # write_to: 输出文件路径
            # output_width/output_height: 指定输出图像的像素尺寸
            cairosvg.svg2png(
                url=svg_file,
                write_to=output_png,
                output_width=size,
                output_height=size
            )
            print(f"✔️ 成功创建 '{output_png}' ({size}x{size})")

        except Exception as e:
            print(f"❌ 转换到 {size}x{size} 时发生错误: {e}")

    print("\n所有转换任务已完成！")

# --- 主程序入口 ---
if __name__ == "__main__":
    # 定义输入文件名
    input_svg_file = "icon.svg"

    # 定义需要输出的尺寸列表
    target_sizes = [16, 48, 128]

    # 调用转换函数
    convert_svg_to_pngs(input_svg_file, target_sizes)
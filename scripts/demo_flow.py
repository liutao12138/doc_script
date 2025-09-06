"""
演示完整的文档处理流程
这是一个简化的演示脚本，展示从文件下载到数据保存的完整流程
"""
import sys
import os
import time
import json
from typing import Dict, Any, List
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import db_manager
from src.services.file_operations import file_ops
from src.services.document_converter import doc_converter
from src.services.document_chunker import doc_chunker
from src.services.vectorizer import vectorizer
from src.utils.logger_config import app_logger

def demo_complete_flow():
    """演示完整的文档处理流程"""
    
    print("🚀 开始演示完整的文档处理流程")
    print("=" * 60)
    
    # 模拟文件信息
    demo_files = [
        {
            'id': 'demo_file_001',
            'name': 'demo_document.pdf',
            'url': 'https://example.com/demo_document.pdf',
            'type': 'application/pdf',
            'size': 1024000
        },
        {
            'id': 'demo_file_002', 
            'name': 'demo_document.docx',
            'url': 'https://example.com/demo_document.docx',
            'type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'size': 512000
        }
    ]
    
    processed_count = 0
    failed_count = 0
    
    for i, file_info in enumerate(demo_files, 1):
        file_id = file_info['id']
        file_name = file_info['name']
        
        print(f"\n📄 处理文件 {i}/{len(demo_files)}: {file_name}")
        print("-" * 40)
        
        try:
            # 步骤1: 添加文件到数据库
            print("  📝 步骤1: 添加文件到处理队列")
            db_manager.add_file(
                file_id=file_id,
                file_name=file_name,
                file_url=file_info['url'],
                file_size=file_info['size'],
                file_type=file_info['type'],
                metadata=file_info
            )
            print(f"     ✅ 文件已添加到队列: {file_name}")
            
            # 步骤2: 模拟下载文件
            print("  📥 步骤2: 下载文件")
            db_manager.update_status(file_id, "downloading")
            time.sleep(1)  # 模拟下载时间
            
            # 模拟下载路径
            download_path = f"/tmp/downloads/{file_id}_{file_name}"
            db_manager.update_status(file_id, "downloaded", download_path=download_path)
            print(f"     ✅ 文件下载完成: {download_path}")
            
            # 步骤3: 模拟转换文档
            print("  🔄 步骤3: 转换文档为Markdown")
            db_manager.update_status(file_id, "converting")
            time.sleep(2)  # 模拟转换时间
            
            # 模拟转换后的Markdown路径
            markdown_path = f"/tmp/output/markdown/{file_id}.md"
            db_manager.update_status(file_id, "converted", markdown_path=markdown_path)
            print(f"     ✅ 文档转换完成: {markdown_path}")
            
            # 步骤4: 模拟切片文档
            print("  ✂️  步骤4: 切片文档")
            db_manager.update_status(file_id, "chunking")
            time.sleep(1)  # 模拟切片时间
            
            # 模拟切片结果
            chunk_count = 5  # 假设生成5个切片
            chunks = [
                {
                    'id': f"{file_id}_chunk_{j}",
                    'content': f"这是第{j}个切片的内容...",
                    'metadata': {'chunk_index': j, 'file_id': file_id}
                }
                for j in range(1, chunk_count + 1)
            ]
            db_manager.update_status(file_id, "chunked", chunk_count=chunk_count)
            print(f"     ✅ 文档切片完成: 生成了 {chunk_count} 个切片")
            
            # 步骤5: 模拟向量化切片
            print("  🧠 步骤5: 向量化切片")
            db_manager.update_status(file_id, "vectorizing")
            time.sleep(3)  # 模拟向量化时间
            
            # 模拟向量化结果
            vectorized_chunks = [
                {
                    'chunk_id': chunk['id'],
                    'content': chunk['content'],
                    'embedding': [0.1, 0.2, 0.3, 0.4, 0.5],  # 模拟向量
                    'metadata': chunk['metadata']
                }
                for chunk in chunks
            ]
            db_manager.update_status(file_id, "vectorized", vector_count=len(vectorized_chunks))
            print(f"     ✅ 切片向量化完成: 生成了 {len(vectorized_chunks)} 个向量")
            
            # 步骤6: 模拟保存数据
            print("  💾 步骤6: 保存数据到向量数据库")
            db_manager.update_status(file_id, "saving")
            time.sleep(1)  # 模拟保存时间
            
            # 模拟保存成功
            db_manager.update_status(file_id, "completed")
            print(f"     ✅ 数据保存完成")
            
            processed_count += 1
            print(f"  🎉 文件处理完成: {file_name}")
            
        except Exception as e:
            print(f"  ❌ 文件处理失败: {file_name} - {str(e)}")
            db_manager.update_status(file_id, "failed", error_message=str(e))
            failed_count += 1
    
    # 生成处理报告
    print("\n" + "=" * 60)
    print("📊 处理报告")
    print("=" * 60)
    print(f"总文件数: {len(demo_files)}")
    print(f"成功处理: {processed_count}")
    print(f"处理失败: {failed_count}")
    print(f"成功率: {processed_count / len(demo_files) * 100:.1f}%")
    
    # 显示数据库统计
    try:
        stats = db_manager.get_statistics()
        print(f"\n📈 数据库统计:")
        print(f"  总文件数: {stats.get('total_files', 0)}")
        print(f"  待处理: {stats.get('pending_files', 0)}")
        print(f"  处理中: {stats.get('processing_files', 0)}")
        print(f"  已完成: {stats.get('completed_files', 0)}")
        print(f"  失败: {stats.get('failed_files', 0)}")
    except Exception as e:
        print(f"获取统计信息失败: {str(e)}")
    
    print("\n🎯 演示完成！")
    print("=" * 60)

def show_processing_status():
    """显示当前处理状态"""
    try:
        stats = db_manager.get_statistics()
        print("📊 当前处理状态:")
        print(json.dumps(stats, indent=2, ensure_ascii=False))
        
        # 显示各状态的文件列表
        from src.core.database import FileProcessingStatus
        
        print("\n📋 文件状态详情:")
        all_files = db_manager.session.query(FileProcessingStatus).all()
        for file_status in all_files:
            print(f"  {file_status.file_name} ({file_status.file_id}): {file_status.status}")
            
    except Exception as e:
        print(f"获取状态失败: {str(e)}")

def main():
    """主函数"""
    if len(sys.argv) > 1 and sys.argv[1] == '--status':
        show_processing_status()
    else:
        demo_complete_flow()
    
    # 关闭数据库连接
    db_manager.close()

if __name__ == '__main__':
    main()

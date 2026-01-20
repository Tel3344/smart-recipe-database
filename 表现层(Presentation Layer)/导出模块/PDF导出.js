// 导出系统设计
class ExportSystem {
  constructor() {
    this.exporters = {
      pdf: new PDFExporter(),
      image: new ImageExporter(),
      shopping: new ShoppingListExporter(),
      json: new JSONExporter(),
      markdown: new MarkdownExporter()
    };
  }
  
  async export(menu, format, options = {}) {
    const exporter = this.exporters[format];
    if (!exporter) {
      throw new Error(`不支持导出格式: ${format}`);
    }
    
    // 生成导出内容
    const content = await exporter.generate(menu, options);
    
    // 创建下载
    return this.createDownload(content, format);
  }
  
  createDownload(content, format) {
    const blob = new Blob([content], { type: this.getMimeType(format) });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `菜单-${new Date().toLocaleDateString()}.${format}`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  getMimeType(format) {
    const types = {
      pdf: 'application/pdf',
      json: 'application/json',
      md: 'text/markdown',
      png: 'image/png',
      txt: 'text/plain'
    };
    return types[format] || 'application/octet-stream';
  }
}

// PDF导出器实现
class PDFExporter {
  async generate(menu, options) {
    // 使用jsPDF或服务器端生成
    const doc = new jsPDF();
    
    // 添加标题
    doc.setFontSize(20);
    doc.text('智能推荐菜单', 20, 20);
    
    // 添加菜单信息
    doc.setFontSize(12);
    doc.text(`生成时间: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`用餐人数: ${options.人数}人`, 20, 40);
    
    // 添加菜谱内容
    let y = 60;
    for (const [category, recipes] of Object.entries(menu)) {
      doc.setFontSize(14);
      doc.text(category, 20, y);
      y += 10;
      
      recipes.forEach(recipe => {
        doc.setFontSize(12);
        doc.text(`• ${recipe.菜品名称}`, 25, y);
        y += 7;
        
        // 添加食材清单
        if (options.包含食材) {
          doc.setFontSize(10);
          recipe.调整后食材.forEach(ingredient => {
            doc.text(`  ${ingredient.食材名称}: ${ingredient.调整用量}`, 30, y);
            y += 5;
          });
        }
        y += 5;
      });
      y += 5;
    }
    
    return doc.output('blob');
  }
}

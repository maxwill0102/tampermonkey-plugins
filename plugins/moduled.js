(function () {
  'use strict';

  // 🔧 抽屉初始化
  const drawer = document.createElement('div');
  drawer.id = 'drawer-activity';
  drawer.innerHTML = `
    <div style="position:fixed;top:0;right:0;width:420px;height:100%;background:white;box-shadow:-2px 0 6px rgba(0,0,0,0.2);z-index:999999;font-family:Arial;padding:16px;overflow-y:auto;">
      <h2 style="margin-top:0;">活动报名 3.0</h2>

      <!-- 第一部分：活动设置 -->
      <div style="margin-bottom:20px;border-bottom:1px solid #ddd;padding-bottom:12px;">
        <div>绑定店铺：<span style="font-weight:bold;">XXX</span></div>
        <div style="margin-top:10px;">
          <label>活动价格方式：</label>
          <select id="price-type">
            <option value="fix">活动价格不低于固定值</option>
            <option value="rate">活动利润率不低于固定比例</option>
          </select>
        </div>
        <div style="margin-top:10px;">
          <span id="price-label">活动价格不低于：</span>
          <input id="price-input" style="width:100px;" placeholder="请输入">
        </div>
        <div style="margin-top:10px;">
          活动库存：
          <input id="stock-input" style="width:100px;" placeholder="库存数量">
        </div>
      </div>

      <!-- 第二部分：活动信息 -->
      <div style="margin-bottom:20px;">
        <h4>长期活动</h4>
        <p>活动类型 + 说明（这里等你下一步补充抓取逻辑）</p>

        <h4>短期活动</h4>
        <div style="display:flex;gap:10px;margin-bottom:8px;">
          <button>跨店满减</button>
          <button>大促进阶-限时活动</button>
          <button>秒杀进阶</button>
          <button>清仓进阶</button>
        </div>
        <div id="short-activity-list" style="height:200px;overflow-y:auto;border:1px solid #ccc;padding:10px;">
          <p>活动数据区域，待后续填充</p>
        </div>
      </div>

      <!-- 第三部分：按钮 -->
      <div style="text-align:center;margin-top:20px;">
        <button style="padding:8px 24px;background:#1e90ff;color:white;border:none;border-radius:4px;">开始报名</button>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);
  // 👇 联动价格类型选择
  const priceTypeSelect = document.getElementById('price-type');
  const priceLabel = document.getElementById('price-label');

  priceTypeSelect.addEventListener('change', () => {
    const type = priceTypeSelect.value;
    if (type === 'fix') {
      priceLabel.textContent = '活动价格不低于：';
    } else if (type === 'rate') {
      priceLabel.textContent = '活动利润率不低于：';
    }
  });

  
})();

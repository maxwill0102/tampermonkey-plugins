// == 模块：活动报名3.0 ==
console.log('✅ moduled.js 已执行');

(function () {
  'use strict';

  // ① 创建抽屉容器（只创建一次）
  if (document.getElementById('drawer-module-3')) return;

  const drawer = document.createElement('div');
  drawer.id = 'drawer-module-3';
  drawer.style.cssText = `
    position:fixed;top:0;right:0;width:400px;height:100%;
    background:white;border-left:1px solid #ccc;z-index:999999;
    padding:20px;overflow-y:auto;font-size:14px;font-family:Arial;
    box-shadow:-2px 0 6px rgba(0,0,0,0.2);
  `;
  drawer.innerHTML = `
    <h2 style="margin-top:0;">📝 活动报名3.0</h2>

    <!-- 🔹 第1部分：活动设置 -->
    <div>
      <div style="margin-bottom:10px;">
        <label>绑定店铺：XXX</label>
      </div>
      <div style="margin-bottom:10px;">
        <label>价格类型：</label>
        <select id="priceType">
          <option value="min">活动价格不低于固定值</option>
          <option value="profit">活动利润率不低于固定比例</option>
        </select>
      </div>
      <div style="margin-bottom:10px;">
        <label id="priceLabel">活动价格不低于：</label>
        <input id="priceInput" type="number" style="width:120px;" /> 元
      </div>
      <div style="margin-bottom:20px;">
        <label>库存数量：</label>
        <input id="stockInput" type="number" style="width:120px;" /> 件
      </div>
    </div>

    <!-- 🔹 第2部分：短期活动 Tabs + 内容 -->
    <div style="margin-top:20px;">
      <div id="activity-tabs" style="display:flex;margin-bottom:8px;">
        <button class="tab-btn active">大促进阶-限时活动</button>
        <button class="tab-btn">跨店满减</button>
        <button class="tab-btn">秒杀进阶</button>
        <button class="tab-btn">清仓进阶</button>
      </div>
      <div id="activity-list-container" style="max-height:250px;overflow-y:auto;border:1px solid #ccc;padding:10px;">
        <!-- 活动列表项将插入这里 -->
      </div>
    </div>

    <!-- 🔹 第3部分：报名按钮 -->
    <div style="text-align:center;margin-top:20px;">
      <button id="submitBtn" style="padding:10px 40px;background:#1e90ff;color:white;border:none;border-radius:5px;">
        开始报名
      </button>
    </div>
  `;

  document.body.appendChild(drawer);

  // ② 绑定价格类型联动逻辑
  const priceType = drawer.querySelector('#priceType');
  const priceLabel = drawer.querySelector('#priceLabel');
  priceType.onchange = () => {
    priceLabel.textContent = priceType.value === 'min'
      ? '活动价格不低于：'
      : '活动利润率不低于：';
  };

  // ③ 添加样式
  GM_addStyle(`
    .tab-btn {
      flex: 1;
      padding: 6px;
      border: none;
      background: #f0f0f0;
      cursor: pointer;
      margin-right: 4px;
      border-radius: 4px;
    }
    .tab-btn.active {
      background: #1e90ff;
      color: white;
      font-weight: bold;
    }
  `);

  // ④ 模拟数据（后面我们再替换成抓取的）
  const mockActivityList = [
    {
      category: '大促进阶-限时活动',
      shop: '个护家清',
      registerStart: '2025/6/10 00:00:00',
      registerEnd: '2025/6/15 14:59:59',
      activityStart: '2025/6/20 00:00:00',
      activityEnd: '2025/6/25 23:59:59',
      joined: false
    },
    {
      category: '大促进阶-限时活动',
      shop: '女装',
      registerStart: '2025/6/12 00:00:00',
      registerEnd: '2025/6/18 14:59:59',
      activityStart: '2025/6/26 00:00:00',
      activityEnd: '2025/7/1 23:59:59',
      joined: true
    }
  ];

  function renderActivityList(category) {
    const container = drawer.querySelector('#activity-list-container');
    container.innerHTML = '';

    const list = mockActivityList.filter(item => item.category === category);
    if (list.length === 0) {
      container.innerHTML = '<div style="color:#888;">暂无活动</div>';
      return;
    }

    list.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'border-bottom:1px solid #eee;padding:6px 0;font-size:13px;';
      row.innerHTML = `
        <div><b>店铺：</b>${item.shop}</div>
        <div><b>报名：</b>${item.registerStart} ~ ${item.registerEnd}</div>
        <div><b>活动：</b>${item.activityStart} ~ ${item.activityEnd}</div>
        <label><input type="checkbox" ${item.joined ? 'checked' : ''}/> 已报名</label>
      `;
      container.appendChild(row);
    });
  }

  // ⑤ 绑定 tab 切换
  const tabBtns = drawer.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderActivityList(btn.textContent.trim());
    };
  });

  renderActivityList('大促进阶-限时活动'); // 默认显示

})();

// ==UserScript==
// @name         活动报名插件 V4.5 修正版
// @namespace    https://yourdomain.com
// @version      4.5.1
// @description  支持价格校验、长期/短期活动展示、首批商品抓取测试
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 一：样式（不动）
  GM_addStyle(`
    #moduled-drawer { position: fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin-bottom:10px; }
    .moduled-input-group label { display:block; font-size:14px; margin-bottom:4px; }
    .moduled-input-group input, .moduled-input-group select { width:100%; padding:6px; font-size:14px; }
    .moduled-tabs { display:flex; margin-bottom:10px; border-bottom:1px solid #ccc; }
    .moduled-tab { flex:1; text-align:center; padding:8px; cursor:pointer; font-weight:bold; }
    .moduled-tab.active { color:red; border-bottom:2px solid red; }
    .moduled-tab-panel { display:none; max-height:300px; overflow-y:auto; }
    .moduled-tab-panel.active { display:block; }
    .moduled-table-header, .moduled-table-row { display:grid; grid-template-columns:1.5fr 2fr 2fr 1fr 1fr; gap:10px; padding:6px 0; align-items:center; }
    .moduled-table-header { font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:4px; }
    .moduled-table-row { border-bottom:1px dashed #ddd; }
  `);

  // 二：抓取并打印首批商品用于测试
  function fetchFirstBatch(type, thematicId) {
    console.log(`📣 测试抓取首批：type=${type} thematicId=${thematicId}`);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'content-type':'application/json',
        'mallid': '634418223153529',
        'anti-content': '请替换为你的 anti-content 值',
        'referer': location.href,
        'origin': location.origin,
        'cookie': document.cookie,
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify({
        activityType: Number(type),
        activityThematicId: Number(thematicId),
        rowCount: 50,
        addSite: true,
        searchScrollContext: ''
      }),
      onload(res) {
        let data;
        try { data = JSON.parse(res.responseText); }
        catch (e) { return console.error('❌ 返回解析失败', e); }
        if (data.success && data.result && Array.isArray(data.result.matchList)) {
          console.log('✅ 首批 matchList:', data.result.matchList);
        } else {
          console.warn('⚠️ 返回结构异常：', data);
        }
      },
      onerror(err) { console.error('❌ 请求错误', err); }
    });
  }

  // 三：渲染长期活动列表并注入 data- 属性
  function fetchActivityData() {
    const longContainer = document.getElementById('moduled-long');
    if (!longContainer) return;
    longContainer.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
      const link = el.querySelector('a') || {};
      const url = new URL(link.href || '', location.origin);
      const type = url.searchParams.get('type') || '';
      const themId = url.searchParams.get('thematicId') || '';
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim() || '';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim() || '';
      longContainer.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div>
          <div>${desc}</div>
          <div>
            <input type="radio" name="activity" 
                   data-type="${type}" 
                   data-thematicid="${themId}" />
          </div>
        </div>`;
    });
  }

  // 四：渲染短期活动标签页并注入 data- 属性
  async function fetchShortTermActivities() {
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if (roots.length < 2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for (let i=0; i<tabs.length; i++) {
      const radioName = `short-${i}`;
      tabs[i].click();
      await new Promise(r=>setTimeout(r,800));
      const panel = panels[i];
      panel.innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=> {
        const cells = row.querySelectorAll('[data-testid="beast-core-table-td"]');
        if (cells.length<5) return;
        // 取链接参数
        const link = cells[0].querySelector('a') || {};
        const url = new URL(link.href||'', location.origin);
        const type = url.searchParams.get('type')||'';
        const themId = url.searchParams.get('thematicId')||'';
        panel.innerHTML += `
          <div class="moduled-table-row">
            <div>${cells[0].innerText.trim()}</div>
            <div>${cells[1].innerText.trim()}</div>
            <div>${cells[2].innerText.trim()}</div>
            <div>${cells[3].innerText.trim()}</div>
            <div>
              <input type="radio" name="activity" 
                     data-type="${type}" 
                     data-thematicid="${themId}" />
            </div>
          </div>`;
      });
    }
  }

  // 五：创建抽屉及绑定事件
  function createDrawer() {
    // 移除旧实例
    document.getElementById('moduled-drawer')?.remove();

    // 构建 DOM
    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 V4.5 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="profit">活动利润率不低于百分比</option>
          </select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group">
          <label>活动库存数量（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>
      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>
      <div class="moduled-section">
        <strong>短期活动</strong>
        <div class="moduled-tabs">
          <div class="moduled-tab active" data-tab="0">大促</div>
          <div class="moduled-tab" data-tab="1">秒杀</div>
          <div class="moduled-tab" data-tab="2">清仓</div>
        </div>
        <div id="moduled-short-panels">
          <div class="moduled-tab-panel active" id="moduled-tab-0"></div>
          <div class="moduled-tab-panel" id="moduled-tab-1"></div>
          <div class="moduled-tab-panel" id="moduled-tab-2"></div>
        </div>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;
    document.body.appendChild(drawer);

    // 关闭
    drawer.querySelector('#moduled-close').onclick = () => drawer.remove();

    // 改变 price-label
    drawer.querySelector('#moduled-price-mode').onchange = function() {
      drawer.querySelector('#moduled-price-label').textContent =
        this.value==='profit' ? '活动利润率不低于' : '活动价格不低于';
    };

    // 短期标签页切换
    drawer.querySelectorAll('.moduled-tab').forEach(tab=>{
      tab.onclick = () => {
        drawer.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(el=>el.classList.remove('active'));
        tab.classList.add('active');
        drawer.querySelector('#moduled-tab-'+tab.dataset.tab).classList.add('active');
      };
    });

    // 填充活动列表
    fetchActivityData();
    fetchShortTermActivities();

    // 立即报名：只取首个选中，校验价格，并测试抓首批数据
    drawer.querySelector('#moduled-submit').onclick = () => {
      const priceVal = drawer.querySelector('#moduled-price-input').value.trim();
      if (!priceVal) return alert('请填写活动价格');
      const sel = drawer.querySelector('input[name="activity"]:checked');
      if (!sel) return alert('请先选择一个活动');
      const type = sel.dataset.type;
      const them = sel.dataset.thematicid;
      console.log('🎯 选中活动参数：', { type, thematicId: them });
      fetchFirstBatch(type, them);
    };
  }

  // 插件入口
  window.__moduled_plugin__ = createDrawer;
})();

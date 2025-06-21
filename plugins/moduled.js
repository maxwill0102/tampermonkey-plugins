// ==UserScript==
// @name         活动报名插件 V4.8.5（带图+可用版）
// @namespace    https://yourdomain.com
// @version      4.8.5
// @description  详情视图带缩略图，点击立即报名可循环展示首批商品
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // —— 样式 —— 
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff;
      border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial;
      box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
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
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { padding:8px; border:1px solid #ddd; vertical-align:top; }
    th { background:#f9f9f9; }
    .product-cell { display:flex; align-items:flex-start; }
    .product-cell img { width:60px; height:60px; object-fit:cover; margin-right:8px; }
    .product-cell .title { flex:1; font-size:14px; line-height:1.2; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  `);

  // —— React Fiber Props 工具 —— 
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps) ||
               (f._currentElement && f._currentElement.props) || {};
      }
    }
    return {};
  }

  // —— 渲染“报名详情”视图 —— 
  function renderSubmitPage(config) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p>价格方式：${config.mode==='profit'?'利润率不低于':'价格不低于固定值'} ${config.priceVal}</p>
        <p>活动库存：${config.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p>当前活动：${config.current} / ${config.total}</p>
        <p>报名成功：${config.success} / ${config.attempt}</p>
        <p>未报名数量：${config.attempt - config.success}</p>
      </div>
      <div class="moduled-section">
        <table>
          <thead>
            <tr>
              <th>商品信息</th><th>SKC</th><th>日常价格</th><th>活动申报价</th><th>是否满足</th><th>活动库存</th><th>是否成功</th>
            </tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">正在加载首批商品数据...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-pause">暂停</button>
      </div>
    `;
    // 关闭返抽屉
    d.querySelector('#moduled-close').onclick = () => produceDrawer();
  }

  // —— 填充首批多条商品 —— 
  function fillFirstProduct(data, config) {
    const tbody = document.getElementById('product-rows');
    tbody.innerHTML = '';
    data.forEach(item => {
      const siteInfo = item.activitySiteInfoList[0]||{};
      const skcInfo  = siteInfo.skcList[0]||{};
      const sku      = skcInfo.skuList[0]||{};
      const picUrl   = item.pictureUrl||'';
      const title    = item.productName||'';
      const skcId    = skcInfo.skcId||'';
      const ext      = sku.extCode||'';
      const daily    = sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2):'';
      const sug      = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2):'';
      const meet     = (sku.suggestActivityPrice/100) >= config.priceVal ? '是':'否';
      const stock    = meet==='是' ? (config.stockVal||item.suggestActivityStock):'';
      const success  = ''; // 未来可填入成功/失败状态
      tbody.innerHTML += `
        <tr>
          <td>
            <div class="product-cell">
              <img src="${picUrl}" />
              <div class="title" title="${title}">${title}</div>
            </div>
          </td>
          <td>${skcId}<br>货号:${ext}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
          <td>${success}</td>
        </tr>`;
    });
  }

  // —— 拉取并渲染首批 —— 
  function fetchAndRenderFirst(type, thematicId, config) {
    renderSubmitPage(config);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid':'634418223153529',
        'anti-content':'0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ',
        'referer':location.href,
        'origin':location.origin,
        'cookie':document.cookie,
        'user-agent':navigator.userAgent
      },
      data: JSON.stringify({
        activityType: Number(type),
        activityThematicId: Number(thematicId),
        rowCount: 50,
        addSite: true,
        searchScrollContext: ''
      }),
      onload(res) {
        try {
          const d = JSON.parse(res.responseText);
          if (d.success && d.result.matchList.length) {
            fillFirstProduct(d.result.matchList, config);
          } else {
            console.warn('无首批数据', d);
          }
        } catch(e) {
          console.error('解析失败', e);
        }
      },
      onerror(err) {
        console.error('请求失败', err);
      }
    });
  }

  // —— 长期/短期渲染（保持原来 V4.8.3 逻辑） —— 
  function fetchActivityData() { /* …原来代码… */ }
  async function fetchShortTermActivities() { /* …原来代码… */ }

  // —— 创建抽屉 —— 
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div'); d.id='moduled-drawer';

    let html = `
      <h2>活动报名 V4.8.5 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">不低于</option>
            <option value="profit">利润率不低于</option>
          </select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>`;

    if (!isDetail) {
      html += `
      <div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>
      <div class="moduled-section"><strong>短期活动</strong>
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
      </div>`;
    }

    html += `<div class="moduled-section" style="text-align:center"><button id="moduled-submit">立即报名</button></div>`;
    d.innerHTML = html;
    document.body.appendChild(d);

    d.querySelector('#moduled-close').onclick = () => d.remove();
    d.querySelector('#moduled-price-mode').onchange = function() {
      d.querySelector('#moduled-price-label').textContent =
        this.value === 'profit' ? '利润率不低于' : '活动价格不低于';
    };

    if (!isDetail) {
      // 切 Tab & 渲染列表
      d.querySelectorAll('.moduled-tab').forEach(tab => tab.onclick = () => {
        d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e => e.classList.remove('active'));
        tab.classList.add('active');
        d.querySelector('#moduled-tab-'+tab.dataset.tab).classList.add('active');
      });
      fetchActivityData();
      fetchShortTermActivities();
      // 列表页“立即报名”
      d.querySelector('#moduled-submit').onclick = () => {
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const sel      = d.querySelector('input[name="activity"]:checked');
        if (!sel) return alert('请选择活动');
        fetchAndRenderFirst(sel.dataset.type, sel.dataset.thematicid, {
          mode, priceVal, stockVal, current:1, total:1, success:0, attempt:0
        });
      };
    } else {
      // 详情页“立即报名”
      d.querySelector('#moduled-submit').onclick = () => {
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const params   = new URLSearchParams(location.search);
        const type     = params.get('type')||'13';
        const them     = params.get('thematicId')||params.get('thematicid');
        fetchAndRenderFirst(type, them, {
          mode, priceVal, stockVal, current:1, total:1, success:0, attempt:0
        });
      };
    }
  }

  // —— 插件入口 —— 
  function produceDrawer() {
    const path = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(path);
    const isDetail = path.includes('/detail-new');
    if (!isList && !isDetail) {
      alert('请打开营销活动列表或具体活动报名页面');
      return;
    }
    createDrawer(isDetail);
  }

  // 暴露给控制台或按钮
  window.__moduled_plugin__ = produceDrawer;

})();

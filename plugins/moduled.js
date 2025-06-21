// ==UserScript==
// @name         活动报名插件 V4.8.8＋（保表格渲染 + 悬浮暂停/继续 + 短期活动修复）
// @namespace    https://yourdomain.com
// @version      4.8.8.3-fixed-short
// @description  保留 V4.8.6 UI，批量拉取 & 一次性提交报名，悬浮“暂停/继续”，优化渲染：仅更新统计、不重绘表格，避免闪烁。兼容列表页/详情页抽屉。修复短期活动 Tab 与数据错位问题。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  /*** —— 常量 & 全局状态 —— ***/
  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  window.__moduled_paused__        = false;
  window.__moduled_scrollContext__ = '';
  window.__moduled_type__          = 13;
  window.__moduled_thematicId__    = null;
  window.__moduled_config__        = {
    mode: 'fixed',
    priceVal: 0,
    stockVal: '',
    batchIndex: 0,
    totalBatches: 0,
    successCount: 0,
    skipCount: 0
  };

  /*** —— 样式 —— ***/
  GM_addStyle(`
    /* 保留原样式 + 长期活动美化 + 新增短期活动表格 */
    #moduled-drawer {position: fixed; top: 0; right: 0; width: 780px; height: 100%; background: #fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial,sans-serif; box-shadow:-2px 0 8px rgba(0,0,0,0.2);}
    #moduled-drawer h2 {font-size:18px; padding:16px; margin:0; border-bottom:1px solid #eee; background:#fafafa; position:relative;}
    #moduled-close {position:absolute; top:12px; right:12px; cursor:pointer; font-size:16px;}
    .moduled-section {padding:16px; border-bottom:1px solid #eee;}
    .moduled-input-group {margin-bottom:12px;}
    .moduled-input-group label{display:block; font-size:14px; margin-bottom:4px;}
    .moduled-input-group input, .moduled-input-group select{width:100%; padding:8px; font-size:14px; border:1px solid #ccc; border-radius:4px;}
    #moduled-submit {padding:8px 16px; font-size:14px; border:none; color:#fff; border-radius:4px; cursor:pointer; background:#007bff;}
    #floating-pause-btn {position:fixed; top:100px; right:30px; z-index:1000000; padding:8px 16px; font-size:14px; border:none; color:#fff; border-radius:4px; cursor:pointer; background:#dc3545;}
    #floating-pause-btn.paused {background:#28a745;}
    table {width:100%; border-collapse:collapse; margin-top:8px; table-layout:fixed;}
    th, td {padding:8px; border:1px solid #ddd; vertical-align:top; word-wrap:break-word;}
    th {background:#f5f5f5; font-weight:500; text-align:left;}
    .product-cell {display:flex; align-items:flex-start;}
    .product-cell img {width:60px; height:60px; object-fit:cover; margin-right:8px; border:1px solid #eee; border-radius:4px;}
    .product-cell .title {flex:1; font-size:14px; line-height:1.4; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;}
    /* 长期活动 */
    #moduled-long table {width:100%; border-collapse:collapse; font-size:14px; margin-top:8px;}
    #moduled-long th, #moduled-long td {padding:8px; border:1px solid #eee; vertical-align:middle;}
    #moduled-long th {background:#fafafa; font-weight:500;}
    #moduled-long tbody tr:nth-child(odd){background:#fdfdfd;}
    #moduled-long tbody tr:hover{background:#f0f8ff;}
    #moduled-long td.select-col{text-align:center; width:80px;}
    /* 短期活动 */
    /* 克隆自页面的 Tab */
    #moduled-short-tabs-container .TAB_outerWrapper_5-118-0 {width:auto!important;}
    /* 我们的表格 */
    .moduled-short-table-wrapper {max-height:240px; overflow-y:auto; border:1px solid #eee; margin-top:8px;}
    .moduled-short-table {width:100%; border-collapse:collapse; font-size:14px; table-layout:fixed;}
    .moduled-short-table th, .moduled-short-table td {padding:8px; border-bottom:1px solid #eee; vertical-align:middle;}
    .moduled-short-table thead th {background:#fafafa; position:sticky; top:0; z-index:1;}
    .moduled-short-table tbody tr:nth-child(odd){background:#fdfdfd;}
    .moduled-short-table tbody tr:hover{background:#f0f8ff;}
    .moduled-short-table td.select-col{text-align:center; width:60px;}
  `);

  /*** —— React Props —— ***/
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return&&f.return.memoizedProps)||(f._currentElement&&f._currentElement.props)||{};
      }
    }
    return {};
  }

  /*** —— 构建抽屉 —— ***/
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';

    let html = `
      <h2>活动报名 V4.8.8 <span id="moduled-close">✕</span></h2>
      <div class="moduled-section">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">价格不低于</option>
            <option value="profit">利润率不低于</option>
          </select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">价格不低于</label>
          <input type="number" id="moduled-price-input" placeholder="必填">
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认">
        </div>
      </div>`;

    if (!isDetail) {
      // 长期活动
      html += `<div class="moduled-section"><strong>长期活动</strong><div id="moduled-long"></div></div>`;
      // 短期活动：先克隆页面上第二个原生 Tab，再放表格
      html += `
      <div class="moduled-section"><strong>短期活动</strong>
        <div id="moduled-short-tabs-container"></div>
        <div class="moduled-short-table-wrapper">
          <table class="moduled-short-table">
            <thead>
              <tr>
                <th>主题</th>
                <th>报名时间</th>
                <th>活动时间</th>
                <th>已报名</th>
                <th class="select-col">选择</th>
              </tr>
            </thead>
            <tbody id="moduled-short-body"></tbody>
          </table>
        </div>
      </div>`;
    }

    html += `<div class="moduled-section" style="text-align:center">
               <button id="moduled-submit">立即报名</button>
             </div>`;

    d.innerHTML = html;
    document.body.appendChild(d);

    // 关闭
    d.querySelector('#moduled-close').onclick = () => d.remove();
    // 切换文字
    d.querySelector('#moduled-price-mode').onchange = function(){
      d.querySelector('#moduled-price-label').textContent =
        this.value==='profit'?'利润率不低于':'价格不低于';
    };

    // 列表页逻辑
    if (!isDetail) {
      renderLongTermTable();

      // 克隆第二个原生 Tab
      const tabsAll = document.querySelectorAll('.TAB_outerWrapper_5-118-0');
      if (tabsAll.length>=2) {
        const clone = tabsAll[1].cloneNode(true);
        clone.style.marginTop = '8px';
        d.querySelector('#moduled-short-tabs-container').appendChild(clone);
        initShortTermListener(clone);
      }
      // 提交
      d.querySelector('#moduled-submit').onclick = onSubmitList;
    }
    // 详情页逻辑
    else {
      d.querySelector('#moduled-submit').onclick = onSubmitDetail;
    }
  }

  /*** —— 长期活动表格 —— ***/
  function renderLongTermTable(){
    const con = document.getElementById('moduled-long');
    if(!con) return;
    con.innerHTML = `
      <table><thead>
        <tr><th>类型</th><th>说明</th><th class="select-col">选择</th></tr>
      </thead><tbody id="moduled-long-body"></tbody></table>`;
    const tbody = document.getElementById('moduled-long-body');
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el=>{
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      let {activityType:type,activityThematicId:them} = getReactProps(el.querySelector('a[data-testid="beast-core-button-link"]'))||{};
      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td style="word-break:break-word;line-height:1.4">${desc}</td>
          <td class="select-col">
            <input type="checkbox" name="activity" data-type="${type}" data-thematicid="${them}">
          </td>
        </tr>`;
    });
  }

  /*** —— 初始化短期活动点击监听 —— ***/
  function initShortTermListener(cloneTabWrapper) {
    const body = document.getElementById('moduled-short-body');
    // 取所有 tab label
    const tabItems = cloneTabWrapper.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    tabItems.forEach((tab, idx)=>{
      tab.style.cursor = 'pointer';
      tab.addEventListener('click', async ()=>{
        // 同步高亮
        tabItems.forEach(t=>t.classList.remove('TAB_active_5-118-0'));
        tab.classList.add('TAB_active_5-118-0');
        // 拉数据
        await loadShortTermByIndex(idx, body);
      });
    });
    // 默认加载第一个
    if(tabItems[0]) tabItems[0].click();
  }

  /*** —— 按 tabIndex 拉短期活动数据 —— ***/
  async function loadShortTermByIndex(idx, body) {
    body.innerHTML = '';
    // 页面上第二个原生 tabs
    const roots = document.querySelectorAll('.TAB_outerWrapper_5-118-0');
    if(roots.length<2) return;
    const container = roots[1];
    const items = container.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    if(!items[idx]) return;
    // 点击原生
    items[idx].click();
    // 等待渲染
    await new Promise(r=>setTimeout(r, 400));

    // 读取 rows
    document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
      const cells = row.querySelectorAll('[data-testid="beast-core-table-td"]');
      if(cells.length<5) return;
      const title     = cells[0].innerText.trim();
      const applyTime = cells[1].innerText.trim();
      const actTime   = cells[2].innerText.trim();
      const joined    = cells[3].innerText.trim();
      let {activityType:type,activityThematicId:them} =
          getReactProps(row.querySelector('a[data-testid="beast-core-button-link"]'))||{};
      body.innerHTML += `
        <tr>
          <td>${title}</td>
          <td>${applyTime}</td>
          <td>${actTime}</td>
          <td>${joined}</td>
          <td class="select-col">
            <input type="checkbox" name="activity" data-type="${type}" data-thematicid="${them}">
          </td>
        </tr>`;
    });
  }

  /*** —— 提交（列表页） —— ***/
  function onSubmitList(){
    const d = document.getElementById('moduled-drawer');
    const mode     = d.querySelector('#moduled-price-mode').value;
    const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
    if(!priceVal) return alert('请填写价格阈值');
    const stockVal = d.querySelector('#moduled-stock-input').value.trim();
    const sels = Array.from(d.querySelectorAll('input[name="activity"]:checked'));
    if(!sels.length) return alert('请至少选择一个活动');
    window.__moduled_type__       = +sels[0].dataset.type;
    window.__moduled_thematicId__ = +sels[0].dataset.thematicid;
    window.__moduled_config__ = { mode, priceVal, stockVal, current:0, total:0, success:0, attempt:0 };
    renderSubmitPage(window.__moduled_config__);
    createFloatingPauseBtn();
    fetchBatchAndSubmit();
  }

  /*** —— 提交（详情页） —— ***/
  function onSubmitDetail(){
    const d = document.getElementById('moduled-drawer');
    const mode     = d.querySelector('#moduled-price-mode').value;
    const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
    if(!priceVal) return alert('请填写价格阈值');
    const stockVal = d.querySelector('#moduled-stock-input').value.trim();
    const params   = new URLSearchParams(location.search);
    window.__moduled_type__       = +params.get('type')||13;
    window.__moduled_thematicId__ = + (params.get('thematicId')||params.get('thematicid'));
    window.__moduled_config__ = { mode, priceVal, stockVal, current:0, total:0, success:0, attempt:0 };
    renderSubmitPage(window.__moduled_config__);
    createFloatingPauseBtn();
    fetchBatchAndSubmit();
  }

  /*** —— renderSubmitPage、fetchBatchAndSubmit、submitBatch、fillFirstProduct、createFloatingPauseBtn、togglePause、updateStats…等，与原脚本***/
 /*** —— 渲染“报名详情” —— ***/
  function renderSubmitPage() {
    const cfg = window.__moduled_config__;
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p><strong>价格方式：</strong>${cfg.mode==='profit'?'利润率不低于':'价格不低于'} ${cfg.priceVal}</p>
        <p><strong>活动库存：</strong>${cfg.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p><strong>报名成功：</strong><span id="stat-success">${cfg.successCount}</span></p>
        <p><strong>跳过报名：</strong><span id="stat-skip">${cfg.skipCount}</span></p>
      </div>
      <div class="moduled-section">
        <table>
          <thead>
            <tr>
              <th style="width:30%">商品信息</th>
              <th style="width:15%">SKC</th>
              <th style="width:10%">日常价格</th>
              <th style="width:10%">申报价</th>
              <th style="width:10%">是否满足</th>
              <th style="width:10%">库存</th>
              <th style="width:10%">状态</th>
            </tr>
          </thead>
          <tbody id="product-rows"></tbody>
        </table>
      </div>`;
  d.querySelector('#moduled-close').onclick = () => {
  // 1. 先关闭当前“报名详情”抽屉，回到活动列表或详情页

  // 2. 同时把悬浮的按钮都清理掉
  document.getElementById('floating-pause-btn')?.remove();
  document.getElementById('moduled-pause')?.remove();
  window.__moduled_plugin__();
};

    
  }

  /*** —— 更新统计 —— ***/
  function updateStats() {
    const cfg = window.__moduled_config__;
    document.getElementById('stat-success').innerText = cfg.successCount;
    document.getElementById('stat-skip').innerText    = cfg.skipCount;
  }

  /*** —— 悬浮“暂停/继续”按钮 —— ***/
  function createFloatingPauseBtn() {
    if (document.getElementById('floating-pause-btn')) return;
    const btn = document.createElement('button');
    btn.id        = 'floating-pause-btn';
    btn.innerText = '暂停';
    btn.onclick   = togglePause;
    document.body.appendChild(btn);
  }
  function updatePauseBtn() {
    const b = document.getElementById('floating-pause-btn');
    if (!b) return;
    if (window.__moduled_paused__) {
      b.classList.add('paused');
      b.innerText = '继续';
    } else {
      b.classList.remove('paused');
      b.innerText = '暂停';
    }
  }
  function togglePause() {
    window.__moduled_paused__ = !window.__moduled_paused__;
    updatePauseBtn();
    if (!window.__moduled_paused__) {
      fetchBatchAndSubmit();
    }
  }

  /*** —— 批量拉取 + 分批提交 —— ***/
  function fetchBatchAndSubmit() {
    if (window.__moduled_paused__) return;
    const cfg = window.__moduled_config__;
    const type = window.__moduled_type__;
    const them = window.__moduled_thematicId__;
    cfg.batchIndex++;

    GM_xmlhttpRequest({
      method:'POST',
      url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers:{
        'Content-Type':'application/json',
        'mallid': MALLID,
        'anti-content': ANTI_CONTENT
      },
      data: JSON.stringify({
        activityType: type,
        activityThematicId: them,
        rowCount: 50,
        addSite: true,
        searchScrollContext: window.__moduled_scrollContext__
      }),
      onload(resp) {
        const d = JSON.parse(resp.responseText);
        if (!d.success) return alert('拉取失败：' + d.errorMsg);

        const batch = d.result.matchList || [];
        window.__moduled_scrollContext__ = d.result.searchScrollContext || '';
        if (!cfg.totalBatches && d.result.totalCount) {
          cfg.totalBatches = Math.ceil(d.result.totalCount / 50);
        }

        // 过滤满足条件
        const meetList = batch.filter(it => {
          const sku = it.activitySiteInfoList[0]?.skcList[0]?.skuList[0] || {};
          const sug = (sku.suggestActivityPrice || 0) / 100;
          const daily = (sku.dailyPrice || 0) / 100;
          if (cfg.mode === 'fixed') return sug >= cfg.priceVal;
          return ((sug - daily) / daily * 100) >= cfg.priceVal;
        });

        cfg.skipCount += (batch.length - meetList.length);

        // 渲染预览：示例前5条
        renderPreview(meetList);
        updateStats();
        createFloatingPauseBtn();
        updatePauseBtn();

        if (meetList.length > 0) {
          // 批量提交这一批
          const payload = {
            activityType: type,
            activityThematicId: them,
            productList: meetList.map(it => {
              const sk  = it.activitySiteInfoList[0].skcList[0];
              const sku = sk.skuList[0];
              const stock = cfg.stockVal || it.suggestActivityStock;
              const sess  = it.suggestEnrollSessionIdList.length
                             ? it.suggestEnrollSessionIdList
                             : it.enrollSessionIdList || [];
              return {
                productId: it.productId,
                activityStock: stock,
                sessionIds: sess,
                siteInfoList: [{
                  siteId: 100, skcList: [{
                    skcId: sk.skcId,
                    skuList: [{
                      skuId: sku.skuId,
                      activityPrice: sku.suggestActivityPrice
                    }]
                  }]
                }]
              };
            })
          };
          GM_xmlhttpRequest({
            method:'POST',
            url:'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
            headers:{ 'Content-Type':'application/json', 'mallid':MALLID },
            data: JSON.stringify(payload),
            onload(r2) {
              const d2 = JSON.parse(r2.responseText);
              if (d2.success) {
                cfg.successCount += d2.result.successCount || 0;
              }
              updateStats();
              updatePauseBtn();
              // 随机延时 12–23s 再下批
              const delay = 12000 + Math.random() * 11000;
              setTimeout(fetchBatchAndSubmit, delay);
            },
            onerror() {
              // 重试
              setTimeout(fetchBatchAndSubmit, 5000);
            }
          });
        } else {
          // 本批无提交，直接下批
          fetchBatchAndSubmit();
        }
      },
      onerror() {
        setTimeout(fetchBatchAndSubmit, 5000);
      }
    });
  }

  /*** —— 渲染“示例前5条预览” —— ***/
  function renderPreview(meetList) {
    const tb = document.getElementById('product-rows');
    tb.innerHTML = `
      <tr>
        <td colspan="7" style="color:#777;">
          示例：前 5 条符合条件商品 … 共 ${meetList.length} 条
        </td>
      </tr>`;
    meetList.slice(0,5).forEach(it => {
      const sk  = it.activitySiteInfoList[0].skcList[0];
      const sku = sk.skuList[0];
      const pic = it.pictureUrl || '';
      const full= it.productName || '';
      const words = full.split(/\s+/);
      const title = words.slice(0,5).join(' ') + (words.length>5?'...':'');
      const daily = (sku.dailyPrice/100||0).toFixed(2);
      const sug   = (sku.suggestActivityPrice/100||0).toFixed(2);
      const meet  = sug * 1 >= window.__moduled_config__.priceVal ? '是':'否';
      const stock = meet==='是' ? (window.__moduled_config__.stockVal||it.suggestActivityStock) : '';
      tb.innerHTML += `
        <tr>
          <td>
            <div class="product-cell">
              <img src="${pic}" /><div class="title" title="${full}">${title}</div>
            </div>
          </td>
          <td>${sk.skcId}<br>货号:${sku.extCode||''}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
          <td></td>
        </tr>`;
    });
  }

  /*** —— 拉取列表页长期活动 —— ***/
function fetchActivityData() {
  const longCon = document.getElementById('moduled-long');
  if (!longCon) return;
  longCon.innerHTML = `
    <table>
      <thead>
        <tr>
          <th style="width:20%">类型</th>
          <th>说明</th>
          <th class="select-col">选择</th>
        </tr>
      </thead>
      <tbody id="long-rows"></tbody>
    </table>`;
  const tbody = document.getElementById('long-rows');
  document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
    const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim() || '';
    const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim() || '';
    let type='', them='';
    try {
      const btn = el.querySelector('a[data-testid="beast-core-button-link"]');
      ({ activityType:type, activityThematicId:them } = getReactProps(btn));
    } catch{}
    tbody.innerHTML += `
      <tr>
        <td>${name}</td>
        <td style="word-break:break-word;line-height:1.4">${desc}</td>
        <td class="select-col">
          <!-- 改为 checkbox -->
          <input type="checkbox" name="activity" data-type="${type}" data-thematicid="${them}" />
        </td>
      </tr>`;
  });
}



  /*** —— 拉取列表页短期活动 —— ***/
 async function fetchShortTermActivities() {
  const tbody = document.getElementById('moduled-short-body');
  if (!tbody) return;
  tbody.innerHTML = '';         // 清空上一批

  // 拿到页面上第二组 tabs
  const roots = document.querySelectorAll('.TAB_outerWrapper_5-118-0');
  if (roots.length < 2) return;
  const tabContent = roots[1].querySelector('.TAB_tabContentInnerContainer_5-118-0');
  const items = tabContent.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');

  // 对每个 tab 依次点击，然后拉它下面的数据
  for (let i = 0; i < items.length; i++) {
    items[i].click();
    await new Promise(r=>setTimeout(r, 400));

    document
      .querySelectorAll('[data-testid="beast-core-table-body-tr"]')
      .forEach(row => {
        const cells = row.querySelectorAll('[data-testid="beast-core-table-td"]');
        if (cells.length < 5) return;
        const [title, applyTime, actTime, joined] = Array.from(cells).slice(0,4).map(td=>td.innerText.trim());
        let type='', them='';
        try {
          ({activityType:type, activityThematicId:them} =
             getReactProps(row.querySelector('a[data-testid="beast-core-button-link"]')));
        } catch {}
        tbody.insertAdjacentHTML('beforeend', `
          <tr>
            <td>${title}</td>
            <td>${applyTime}</td>
            <td>${actTime}</td>
            <td>${joined}</td>
            <td class="select-col">
              <input type="checkbox" name="activity" data-type="${type}" data-thematicid="${them}" />
            </td>
          </tr>
        `);
      });
  }
}



  /*** —— 启动入口 —— ***/
  function produceDrawer(){
    const p = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if(!isList && !isDetail) return alert('请打开营销活动列表或具体活动报名页面');
    createDrawer(isDetail);
  }
  window.__moduled_plugin__ = produceDrawer;

})();

// ==UserScript==
// @name         活动报名插件 V4.8.8＋（保表格渲染 + 悬浮暂停/继续）
// @namespace    https://yourdomain.com
// @version      4.8.8.3
// @description  保留 V4.8.6 UI，批量拉取 & 一次性提交报名，悬浮“暂停/继续”，优化渲染：仅更新统计、不重绘表格，避免闪烁。兼容列表页/详情页抽屉。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  /*** —— 常量 & 全局状态 —— ***/
  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  window.__moduled_paused__        = false;   // 暂停标志
  window.__moduled_scrollContext__ = '';      // 下次 /match 用的 scrollContext
  window.__moduled_type__          = 13;      // 当前活动 type
  window.__moduled_thematicId__    = null;    // 当前 thematicId
  window.__moduled_config__        = {        // 统计数据
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
    #moduled-drawer {
      position: fixed; top: 0; right: 0;
      width: 780px; height: 100%; background: #fff;
      border-left: 1px solid #ccc; z-index: 999999;
      overflow-y: auto; font-family: Arial, sans-serif;
      box-shadow: -2px 0 8px rgba(0,0,0,0.2);
    }
    #moduled-drawer h2 {
      font-size: 18px; padding: 16px; margin: 0;
      border-bottom: 1px solid #eee; background: #fafafa;
    }
    #moduled-close {
      position: absolute; top: 12px; right: 12px;
      cursor: pointer; font-size: 16px;
    }
    .moduled-section { padding: 16px; border-bottom: 1px solid #eee; }
    .moduled-input-group { margin-bottom: 12px; }
    .moduled-input-group label {
      display: block; font-size: 14px; margin-bottom: 4px;
    }
    .moduled-input-group input,
    .moduled-input-group select {
      width: 100%; padding: 8px; font-size: 14px;
      border: 1px solid #ccc; border-radius: 4px;
    }
    #moduled-submit {
      padding: 8px 16px; font-size: 14px;
      border: none; color: #fff; border-radius: 4px; cursor: pointer;
      background: #007bff;
    }
    #floating-pause-btn {
      position: fixed; top: 100px; right: 30px; z-index:1000000;
      padding: 8px 16px; font-size: 14px; border:none; color:#fff;
      border-radius:4px; cursor:pointer; background:#dc3545;
    }
    #floating-pause-btn.paused {
      background: #28a745;
    }
    table {
      width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed;
    }
    th, td {
      padding: 8px; border:1px solid #ddd; vertical-align: top; word-wrap: break-word;
    }
    th {
      background: #f5f5f5; font-weight: 500; text-align: left;
    }
    .product-cell { display: flex; align-items: flex-start; }
    .product-cell img {
      width: 60px; height: 60px; object-fit: cover;
      margin-right: 8px; border:1px solid #eee; border-radius:4px;
    }
    .product-cell .title {
      flex: 1; font-size:14px; line-height:1.4;
      overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    }
    .moduled-tab { flex:1; text-align:center; padding:8px; cursor:pointer; font-weight:bold; }
    .moduled-tab.active { color:red; border-bottom:2px solid red; }
    .moduled-tab-panel { display:none; max-height:300px; overflow-y:auto; }
    .moduled-tab-panel.active { display:block; }
  `);

  /*** —— React Props 助手 —— ***/
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps)
            || (f._currentElement && f._currentElement.props)
            || {};
      }
    }
    return {};
  }

  /*** —— 构建初始抽屉 —— ***/
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';

    // 配置区：价格模式 & 阈值
    let html = `
      <h2>活动报名 V4.8.8 <span id="moduled-close">❌</span></h2>
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
          <input type="number" id="moduled-price-input" placeholder="必填" />
        </div>
        <div class="moduled-input-group">
          <label>活动库存（选填）</label>
          <input type="number" id="moduled-stock-input" placeholder="默认" />
        </div>
      </div>`;

    // 列表页时显示长期/短期活动
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

    // “立即报名”按钮
    html += `
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-submit">立即报名</button>
      </div>`;

    d.innerHTML = html;
    document.body.appendChild(d);

    // 关闭按钮
    d.querySelector('#moduled-close').onclick = () => {
      const drawer = document.getElementById('moduled-drawer');
      if (drawer) drawer.remove();
  };


    // 切换价格模式文字
    d.querySelector('#moduled-price-mode').onchange = function() {
      d.querySelector('#moduled-price-label').textContent =
        this.value === 'profit' ? '利润率不低于' : '价格不低于';
    };

    // 列表页逻辑：拉取活动 & 绑定报名
    if (!isDetail) {
      d.querySelectorAll('.moduled-tab').forEach(tab => {
        tab.onclick = () => {
          d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e => e.classList.remove('active'));
          tab.classList.add('active');
          d.querySelector('#moduled-tab-' + tab.dataset.tab).classList.add('active');
        };
      });
      fetchActivityData();
      fetchShortTermActivities();

      d.querySelector('#moduled-submit').onclick = () => {
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写价格阈值');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const sel = d.querySelector('input[name="activity"]:checked');
        if (!sel) return alert('请选择活动');

        window.__moduled_type__       = +sel.dataset.type;
        window.__moduled_thematicId__ = +sel.dataset.thematicid;
        window.__moduled_scrollContext__ = '';
        window.__moduled_config__ = {
          mode, priceVal, stockVal,
          batchIndex: 0,
          totalBatches: 0,
          successCount: 0,
          skipCount: 0
        };

        renderSubmitPage();
        createFloatingPauseBtn();
        fetchBatchAndSubmit();
      };
    }
    // 详情页逻辑：直接用 URL 参数
    else {
      d.querySelector('#moduled-submit').onclick = () => {
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写价格阈值');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const params = new URLSearchParams(location.search);
        window.__moduled_type__       = +params.get('type') || 13;
        window.__moduled_thematicId__ = +(params.get('thematicId')||params.get('thematicid'));
        window.__moduled_scrollContext__ = '';
        window.__moduled_config__ = {
          mode, priceVal, stockVal,
          batchIndex: 0,
          totalBatches: 0,
          successCount: 0,
          skipCount: 0
        };

        renderSubmitPage();
        createFloatingPauseBtn();
        fetchBatchAndSubmit();
      };
    }
  }

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
    d.querySelector('#moduled-close').onclick = () => window.__moduled_plugin__();
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
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim() || '';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim() || '';
      let type='', them='';
      try {
        const btn = el.querySelector('a[data-testid="beast-core-button-link"]');
        ({activityType:type, activityThematicId:them} = getReactProps(btn));
      } catch {}
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div><div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
        </div>`;
    });
  }

  /*** —— 拉取列表页短期活动 —— ***/
  async function fetchShortTermActivities() {
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if (roots.length<2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for (let i=0; i<tabs.length; i++) {
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = `
        <div class="moduled-table-header">
          <div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div>
        </div>`;
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row => {
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        let type='', them='';
        try {
          const btn = row.querySelector('a[data-testid="beast-core-button-link"]');
          ({activityType:type, activityThematicId:them} = getReactProps(btn));
        } catch {}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
          </div>`;
      });
    }
  }

  /*** —— 启动入口 —— ***/
  function produceDrawer() {
    const p = location.pathname;
    const isList   = /^\/activity\/marketing-activity\/?$/.test(p);
    const isDetail = p.includes('/detail-new');
    if (!isList && !isDetail) {
      return alert('请打开营销活动列表或具体活动报名页面');
    }
    createDrawer(isDetail);
  }
  window.__moduled_plugin__ = produceDrawer;

  // 支持控制台手动执行
  // window.__moduled_plugin__();

})();

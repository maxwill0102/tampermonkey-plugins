// ==UserScript==
// @name         活动报名插件 V4.8.8（批量提交 + 暂停/继续 + 随机延时）
// @namespace    https://yourdomain.com
// @version      4.8.8
// @description  保留 V4.8.6 UI 样式，批量拉取 & 一次性提交报名，支持暂停/继续 & 12–23s 随机延时，兼容列表页/详情页抽屉逻辑。
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  //////////////////////////////
  // —— 常量 & 全局状态 —— //
  //////////////////////////////

  const MALLID       = '634418223153529';
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ';

  // pipeline 状态
  window.__moduled_paused__        = false;   // 暂停标志
  window.__moduled_scrollContext__ = '';      // 下次 /match 用的 scrollContext
  window.__moduled_type__          = 13;      // 当前活动 type
  window.__moduled_thematicId__    = null;    // 当前 thematicId
  window.__moduled_config__        = {};      // { mode, priceVal, stockVal, current, total, success, attempt }
  window.__moduled_rawItems__      = [];      // 本批 fetch 到的原始商品数组

  //////////////////////////////
  // —— 样式（保留 V4.8.6） —— //
  //////////////////////////////

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
    #moduled-submit,
    #moduled-pause {
      padding: 8px 16px; font-size: 14px;
      border: none; color: #fff; border-radius: 4px; cursor: pointer;
    }
    #moduled-submit { background: #007bff; }
    #moduled-pause { background: #dc3545; }
    #moduled-pause.paused { background: #28a745; }
    #auto-submit-btn {
      background: #28a745;
      position: fixed; top: 100px; right: 30px; z-index:1000000;
      padding: 8px 16px; font-size: 14px; border:none; color:#fff; border-radius:4px; cursor:pointer;
    }
    table {
      width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed;
    }
    th, td {
      padding: 8px; border:1px solid #ddd; vertical-align: top; word-wrap: break-word;
    }
    th { background: #f5f5f5; font-weight: 500; text-align: left; }
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

  //////////////////////////////
  // —— React Props 助手 —— //
  //////////////////////////////

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

  //////////////////////////////
  // —— 初始抽屉：设置 & 活动  —— //
  //////////////////////////////

  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';

    // 公共：价格设置
    let html = `
      <h2>活动报名 V4.8.8 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode"><option value="fixed">价格不低于</option><option value="profit">利润率不低于</option></select>
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

    // 列表页：长期/短期活动
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
    html += `<div class="moduled-section" style="text-align:center">
               <button id="moduled-submit">立即报名</button>
             </div>`;

    d.innerHTML = html;
    document.body.appendChild(d);

    // 关闭抽屉
    d.querySelector('#moduled-close').onclick = () => d.remove();

    // 切换价格模式文本
    d.querySelector('#moduled-price-mode').onchange = function() {
      d.querySelector('#moduled-price-label').textContent =
        this.value === 'profit' ? '利润率不低于' : '价格不低于';
    };

    if (!isDetail) {
      // 长期/短期选项
      d.querySelectorAll('.moduled-tab').forEach(tab => {
        tab.onclick = () => {
          d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e => e.classList.remove('active'));
          tab.classList.add('active');
          d.querySelector('#moduled-tab-' + tab.dataset.tab).classList.add('active');
        };
      });
      fetchActivityData();
      fetchShortTermActivities();

      // 点击“立即报名” -> 开始批量拉取 & 提交
      d.querySelector('#moduled-submit').onclick = () => {
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写价格阈值');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const sel = d.querySelector('input[name="activity"]:checked');
        if (!sel) return alert('请选择活动');

        // 保存状态
        window.__moduled_type__       = +sel.dataset.type;
        window.__moduled_thematicId__ = +sel.dataset.thematicid;
        window.__moduled_scrollContext__ = '';
        window.__moduled_config__ = {
          mode, priceVal, stockVal,
          current: 0, total: 0, success: 0, attempt: 0
        };

        // 切换到“报名详情”视图
        renderSubmitPage(window.__moduled_config__);
        createPauseButton();
        // 启动 pipeline
        fetchBatchAndSubmit();
      };
    } else {
      // 详情页逻辑，直接使用 URL 上的 type/thematicId
      d.querySelector('#moduled-submit').onclick = () => {
        const mode     = d.querySelector('#moduled-price-mode').value;
        const priceVal = Number(d.querySelector('#moduled-price-input').value.trim());
        if (!priceVal) return alert('请填写价格阈值');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();

        const params = new URLSearchParams(location.search);
        window.__moduled_type__       = +params.get('type') || 13;
        window.__moduled_thematicId__ = + (params.get('thematicId') || params.get('thematicid'));
        window.__moduled_scrollContext__ = '';
        window.__moduled_config__ = {
          mode, priceVal, stockVal,
          current: 0, total: 0, success: 0, attempt: 0
        };

        renderSubmitPage(window.__moduled_config__);
        createPauseButton();
        fetchBatchAndSubmit();
      };
    }
  }

  //////////////////////////////
  // —— “报名详情”视图 —— //
  //////////////////////////////

  function renderSubmitPage(cfg) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p><strong>价格方式：</strong>${cfg.mode==='profit'?'利润率不低于':'价格不低于'} ${cfg.priceVal}</p>
        <p><strong>活动库存：</strong>${cfg.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p><strong>已拉批次：</strong>${cfg.current} / ${cfg.total}</p>
        <p><strong>报名成功：</strong>${cfg.success} / ${cfg.attempt}</p>
        <p><strong>剩余条数：</strong>${cfg.attempt - cfg.success}</p>
      </div>
      <div class="moduled-section">
        <table><thead>
          <tr>
            <th style="width:30%">商品信息</th>
            <th style="width:15%">SKC</th>
            <th style="width:10%">日常价格</th>
            <th style="width:10%">申报价</th>
            <th style="width:10%">是否满足</th>
            <th style="width:10%">库存</th>
            <th style="width:10%">状态</th>
          </tr></thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">正在加载商品…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-pause">暂停</button>
      </div>
    `;
    d.querySelector('#moduled-close').onclick = () => createDrawer(false);
    d.querySelector('#moduled-pause').onclick  = togglePause;
  }

  //////////////////////////////
  // —— 暂停/继续 按钮 —— //
  //////////////////////////////

  function createPauseButton() {
    // 已经在视图中，无需额外创建
    updatePauseBtn();
  }

  function togglePause() {
    window.__moduled_paused__ = !window.__moduled_paused__;
    updatePauseBtn();
    if (!window.__moduled_paused__) {
      console.log('▶️ 继续执行');
      fetchBatchAndSubmit();
    }
  }

  function updatePauseBtn() {
    const btn = document.getElementById('moduled-pause');
    if (!btn) return;
    if (window.__moduled_paused__) {
      btn.classList.add('paused');
      btn.textContent = '继续';
    } else {
      btn.classList.remove('paused');
      btn.textContent = '暂停';
    }
  }

  //////////////////////////////
  // —— 批量拉取 & 提交 —— //
  //////////////////////////////

  function fetchBatchAndSubmit() {
    if (window.__moduled_paused__) {
      console.log('⏸ 暂停中，等待继续…');
      return;
    }

    const cfg = window.__moduled_config__;
    const type = window.__moduled_type__;
    const them = window.__moduled_thematicId__;

    console.log(`🔄 /match 批次拉取 scrollContext="${window.__moduled_scrollContext__}" …`);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid': MALLID,
        'anti-content': ANTI_CONTENT,
        'referer': location.href,
        'origin': location.origin
      },
      data: JSON.stringify({
        activityType: type,
        activityThematicId: them,
        rowCount: 50,
        addSite: true,
        searchScrollContext: window.__moduled_scrollContext__
      }),
      onload(resp) {
        let d = JSON.parse(resp.responseText);
        if (!d.success) {
          console.error('❌ /match 失败：', d.errorMsg);
          return;
        }
        const batch = d.result.matchList || [];
        window.__moduled_scrollContext__ = d.result.searchScrollContext || '';
        // 更新统计
        cfg.current += 1;
        cfg.total   = Math.ceil(d.result.totalCount / 50);
        cfg.attempt += batch.length;

        console.log(`📥 批次 #${cfg.current} 拉取到 ${batch.length} 条`);
        window.__moduled_rawItems__ = batch;
        fillFirstProduct(batch, cfg);

        // 构建一次性提交所有满足条件的列表
        const toSubmit = batch.map((item, idx) => {
          const site = item.activitySiteInfoList[0]||{};
          const skc  = site.skcList[0]||{};
          const sku  = skc.skuList[0]||{};
          const sugC = sku.suggestActivityPrice != null ? sku.suggestActivityPrice : 0;
          const dailyC = sku.dailyPrice != null ? sku.dailyPrice : 0;
          const sug = sugC / 100;
          const daily = dailyC / 100;
          let meet = false;
          if (cfg.mode === 'fixed') {
            meet = sug >= cfg.priceVal;
          } else {
            meet = ((sug - daily) / daily * 100) >= cfg.priceVal;
          }
          if (!meet) return null;
          const stockC = cfg.stockVal ? +cfg.stockVal : item.suggestActivityStock;
          const sess = item.suggestEnrollSessionIdList.length
                         ? item.suggestEnrollSessionIdList
                         : item.enrollSessionIdList||[];
          return {
            productId: item.productId,
            activityStock: stockC,
            sessionIds: sess,
            siteInfoList: [{
              siteId: 100,
              skcList: [{
                skcId: skc.skcId,
                skuList: [{
                  skuId: sku.skuId,
                  activityPrice: sugC
                }]
              }]
            }]
          };
        }).filter(x => x);

        if (toSubmit.length === 0) {
          console.log('⚠️ 本批次无满足条件商品');
        } else {
          console.log('📤 本批次统一提交 productList：', toSubmit);
          submitBatch(type, them, toSubmit);
        }

        // 下一批或结束
        if (!d.result.hasMore) {
          console.log('✅ 已无更多批次，全部完成。');
          alert('全部批次提交完毕');
          return;
        }
      },
      onerror(err) {
        console.error('❌ /match 网络错误，1s 后重试', err);
        setTimeout(fetchBatchAndSubmit, 1000);
      }
    });
  }

  //////////////////////////////
  // —— 批量提交 & 随机延时 —— //
  //////////////////////////////

  function submitBatch(type, them, productList) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
      headers: {
        'Content-Type':'application/json',
        'mallid': MALLID
      },
      data: JSON.stringify({
        activityType: type,
        activityThematicId: them,
        productList
      }),
      onload(res) {
        let d = JSON.parse(res.responseText);
        if (d.success) {
          console.log('✅ 本批次提交成功，successCount=', d.result.successCount);
          window.__moduled_config__.success += d.result.successCount;
        } else {
          console.error('❌ 本批次提交失败：', d.errorMsg);
        }
        updatePauseBtn();

        // 随机12~23秒后，再拉下一批
        const delay = Math.floor(Math.random() * (23000 - 12000 + 1)) + 12000;
        console.log(`⏳ 等待 ${delay}ms 后拉取下一批…`);
        setTimeout(fetchBatchAndSubmit, delay);
      },
      onerror(err) {
        console.error('❌ 提交网络错误，1s 后重试', err);
        setTimeout(() => submitBatch(type, them, productList), 1000);
      }
    });
  }

  //////////////////////////////
  // —— 填充表格 —— //
  //////////////////////////////

  function fillFirstProduct(list, cfg) {
    const tb = document.getElementById('product-rows');
    tb.innerHTML = '';
    list.forEach(item => {
      const site = item.activitySiteInfoList[0]||{};
      const skc  = site.skcList[0]||{};
      const sku  = skc.skuList[0]||{};
      const pic  = item.pictureUrl||'';
      const full = item.productName||'';
      const words= full.split(/\s+/);
      const title= words.slice(0,5).join(' ') + (words.length>5?'...':'');
      const daily= sku.dailyPrice != null ? (sku.dailyPrice/100).toFixed(2) : '';
      const sug  = sku.suggestActivityPrice != null ? (sku.suggestActivityPrice/100).toFixed(2) : '';
      let meet;
      if (cfg.mode==='fixed') {
        meet = (sku.suggestActivityPrice/100) >= cfg.priceVal;
      } else {
        meet = ((sku.suggestActivityPrice - sku.dailyPrice) / sku.dailyPrice * 100) >= cfg.priceVal;
      }
      const stock = meet ? (cfg.stockVal||item.suggestActivityStock) : '';
      tb.innerHTML += `
        <tr>
          <td>
            <div class="product-cell">
              <img src="${pic}" />
              <div class="title" title="${full}">${title}</div>
            </div>
          </td>
          <td>${skc.skcId}<br>货号:${sku.extCode||''}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet?'是':'否'}</td>
          <td>${stock}</td>
          <td class="status"></td>
        </tr>`;
    });
  }

  //////////////////////////////
  // —— 列表页 活动拉取 —— //
  //////////////////////////////

  function fetchActivityData() {
    const longCon = document.getElementById('moduled-long');
    if (!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      let type='', them='';
      try {
        const btn = el.querySelector('a[data-testid="beast-core-button-link"]');
        ({activityType:type, activityThematicId:them} = getReactProps(btn));
      } catch{}
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div><div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
        </div>`;
    });
  }

  //////////////////////////////
  // —— 短期活动 拉取 —— //
  //////////////////////////////

  async function fetchShortTermActivities() {
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots  = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if (roots.length<2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for (let i=0; i<tabs.length; i++) {
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row => {
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        let type='', them='';
        try {
          const btn = row.querySelector('a[data-testid="beast-core-button-link"]');
          ({activityType:type, activityThematicId:them} = getReactProps(btn));
        } catch{}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
          </div>`;
      });
    }
  }

  //////////////////////////////
  // —— 启动入口 —— //
  //////////////////////////////

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

  // 你可以在控制台运行 window.__moduled_plugin__() 来手动打开
})();

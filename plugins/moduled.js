// ==UserScript==
// @name         活动报名插件 V4.9.2（批量提交 + 暂停/继续）
// @namespace    https://yourdomain.com
// @version      4.9.2
// @description  批量拉取每批50条商品报名，报名完再拉下一批，直到结束；支持暂停/继续
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const MALLID       = '634418223153529'; // ← 改成你自己的 mallid
  const ANTI_CONTENT = '0aqAfoixYySYj9E2J0didyxgjRAwIqP2ID3kKGzdvqe84kyjIs4HyQfYOmjkrrze-crCiTnixgSUJIf0UKVZgmvQ75Eo_Bl6DEfLU9TF9-475E8cqUGNjYTATLJVJJqWySNB6kUA-xv1ltrWo4j80KfDIeHrC4H_5ekuK9QxQhAxvj9Q_P7hDAT4RTMrofxM5qYQUWAPzhC0WP-cTojUGQUfhZBM448owrxCtZ01vN9jxWjo087lM5hcCnRcBL02IflDP6slH4jZfiC0WUuiDbCQaXnHP7N_2x4t8H9RY2Xbs7UzRP17UlcguQbXRT1XElhr0AuaDJRDMSn88Ai5HNunGj2yyqMNtAcvWouNUwqAud9jnG__Z_Exp1l7pVnYYSB-Ub2L5IXRayS5QKvxL9vyu6BntuXBYSR2a8nqQ5RwjMStfIcXj6a5sljEe5FpqKek4ZlKK3GVq-2gw-2b_dcP0s_PPp3DKJuLtomM_QrzMFzESn2Ues4L4ZfSSRvdfXpV90GmEsbKvnlyvbJdmKkAmwpH-GzctDI4Z8bBkSO1eFK1yZCGZTSFhgq6wTtag96vwP0rvpgOMzEVgnwqkgs7hGqPOdzrdhgqKRZu4Y61vLS31aj1ZcDOoaPHL52nPmkd4bKAA8W_LvnOSy28dLdpDOIj2afFRvTt51-fsn-_ICH1KfzO0ZR-szvBDmKjJB_QffwpggAygXKvEYnFkTP5gWr28VB64SU3lrVVNArqnrc6ZrDgYcQYVAqQz1JXvLXeXGVaRTGqi8K1eWqLiVWK0ronxlyU2gJ'; 

  // 全局状态
  window.__moduled_paused__       = false;
  window.__moduled_scrollContext__ = '';

  // —— 样式（沿用 V4.8.6 + 暂停按钮） —— 
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
      position: absolute; top: 12px; right: 12px; cursor: pointer;
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
    #moduled-pause,
    #auto-submit-btn {
      padding: 8px 16px; font-size: 14px;
      border: none; color: #fff; border-radius: 4px; cursor: pointer;
    }
    #moduled-submit { background: #007bff; }
    #moduled-pause { background: #dc3545; margin-left: 8px; }
    #moduled-pause.paused { background: #28a745; }
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

  // —— React Fiber Props 工具 —— 
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

  // —— 渲染「报名详情」界面 —— 
  function renderSubmitPage(cfg) {
    const d = document.getElementById('moduled-drawer');
    d.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>

      <div class="moduled-section">
        <p><strong>价格方式：</strong>${cfg.mode==='profit'?'利润率不低于':'价格不低于'} ${cfg.priceVal}</p>
        <p><strong>活动库存：</strong>${cfg.stockVal||'默认'}</p>
      </div>

      <div class="moduled-section">
        <button id="moduled-submit">📝 开始批量报名</button>
        <button id="moduled-pause">暂停</button>
      </div>

      <div class="moduled-section">
        <table>
          <thead>
            <tr>
              <th style="width:30%">商品信息</th>
              <th style="width:15%">SKC</th>
              <th style="width:10%">日常价格</th>
              <th style="width:10%">活动申报价</th>
              <th style="width:10%">是否满足</th>
              <th style="width:10%">活动库存</th>
              <th style="width:10%">状态</th>
            </tr>
          </thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">正在加载商品…</td></tr>
          </tbody>
        </table>
      </div>
    `;
    d.querySelector('#moduled-close').onclick = () => d.remove();
    d.querySelector('#moduled-submit').onclick = clickStart;
    d.querySelector('#moduled-pause').onclick  = togglePause;
    updatePauseBtn();
  }

  // —— 更新暂停按钮文字/样式 —— 
  function updatePauseBtn() {
    const btn = document.getElementById('moduled-pause');
    if (!btn) return;
    if (window.__moduled_paused__) {
      btn.classList.add('paused');
      btn.innerText = '继续';
    } else {
      btn.classList.remove('paused');
      btn.innerText = '暂停';
    }
  }

  // —— 点击“开始批量报名” —— 
  function clickStart() {
    window.__moduled_paused__ = false;
    updatePauseBtn();

    // 1. 读配置
    const mode     = document.getElementById('moduled-price-mode').value;
    const priceVal = Number(document.getElementById('moduled-price-input').value);
    if (!priceVal) return alert('请先填写活动价格');
    const stockVal = document.getElementById('moduled-stock-input').value;

    window.__moduled_cfg__ = { mode, priceVal, stockVal };

    // 2. 获取活动 type/thematicId
    const sel = document.querySelector('input[name="activity"]:checked');
    let type, them;
    if (sel) {
      type = sel.dataset.type;
      them = sel.dataset.thematicid;
    } else {
      const p = new URLSearchParams(location.search);
      type = p.get('type') || '13';
      them = p.get('thematicId') || p.get('thematicid');
    }
    if (!them) return alert('请在抽屉里先选择一个活动');

    window.__moduled_type__ = type;
    window.__moduled_them__ = them;
    window.__moduled_scrollContext__ = '';

    // 3. 清空表格并渲染空行
    const tb = document.getElementById('product-rows');
    tb.innerHTML = `<tr><td colspan="7" align="center">拉取中…</td></tr>`;

    // 4. 开始循环
    fetchBatchAndSubmit();
  }

  // —— 暂停/继续 切换 —— 
  function togglePause() {
    window.__moduled_paused__ = !window.__moduled_paused__;
    updatePauseBtn();
    if (!window.__moduled_paused__) {
      // 恢复时，接着拉／提
      fetchBatchAndSubmit();
    }
  }

  // —— 拉取一批（最多50条）并提交 —— 
  function fetchBatchAndSubmit() {
    if (window.__moduled_paused__) return;

    const type = window.__moduled_type__;
    const them = window.__moduled_them__;
    const cfg  = window.__moduled_cfg__;
    const ctx  = window.__moduled_scrollContext__;

    console.log('🌀 拉取 match，一次最多 50 条，scrollContext=', ctx);

    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid': MALLID,
        'anti-content': ANTI_CONTENT,
        'referer': location.href,
        'origin': location.origin,
        'cookie': document.cookie,
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify({
        activityType: Number(type),
        activityThematicId: Number(them),
        rowCount: 50,
        addSite: true,
        searchScrollContext: ctx
      }),
      onload(res) {
        let d;
        try { d = JSON.parse(res.responseText); }
        catch(e){ console.error('match parse error', e); return; }

        if (!d.success) {
          console.error('match 返回失败', d.errorMsg || d.errorCode);
          return alert('拉取 match 出错：' + d.errorMsg);
        }

        const list = d.result.matchList || [];
        console.log('🆗 match 返回', list.length, '条');
        window.__moduled_scrollContext__ = d.result.searchScrollContext || '';

        if (!list.length) {
          return alert('✅ 全部批次拉取完毕，已提交完成！');
        }

        // 先把这一批渲染到表格
        renderBatch(list, cfg);

        // 构建一次性提交 payload（整批提交）
        const payload = {
          activityType: Number(type),
          activityThematicId: Number(them),
          productList: list.map(item => {
            const site = item.activitySiteInfoList[0] || {};
            const skc  = site.skcList[0] || {};
            const sku  = skc.skuList[0] || {};
            return {
              productId: item.productId,
              activityStock: cfg.stockVal ? Number(cfg.stockVal) : item.suggestActivityStock,
              sessionIds: item.suggestEnrollSessionIdList.length
                          ? item.suggestEnrollSessionIdList
                          : item.enrollSessionIdList || [],
              siteInfoList: [{
                siteId: site.siteId,
                skcList: [{
                  skcId: skc.skcId,
                  skuList: [{
                    skuId: sku.skuId,
                    activityPrice: sku.suggestActivityPrice
                  }]
                }]
              }]
            };
          })
        };

        console.log('📤 批量提交 payload：', payload);

        GM_xmlhttpRequest({
          method: 'POST',
          url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/submit',
          headers: {
            'Content-Type':'application/json',
            'mallid': MALLID
          },
          data: JSON.stringify(payload),
          onload(resp) {
            let r;
            try { r = JSON.parse(resp.responseText); }
            catch(e){ console.error('submit parse error', e); return; }

            if (!r.success) {
              console.error('半提交接口返回失败', r.errorMsg);
              alert('提交本批次失败：' + r.errorMsg);
            } else {
              console.log('✅ 本批次提交成功，successCount=', r.result.successCount);
            }
            // 继续下一批
          const delay = Math.floor(Math.random() * (23000 - 12000 + 1)) + 12000;
          console.log(`⏳ 本批次提交完成，${delay}ms 后开始下一批拉取`);
          setTimeout(fetchBatchAndSubmit, delay);
          },
          onerror(err){
            console.error('半提交网络出错', err);
            setTimeout(fetchBatchAndSubmit, 200);
          }
        });
      },
      onerror(err) {
        console.error('match 网络出错', err);
        setTimeout(fetchBatchAndSubmit, 1000);
      }
    });
  }

  // —— 渲染当前批数据到表格，下次再直接覆盖 —— 
  function renderBatch(list, cfg) {
    const tb = document.getElementById('product-rows');
    tb.innerHTML = ''; 
    list.forEach(item => {
      const site = item.activitySiteInfoList[0] || {};
      const skc  = site.skcList[0] || {};
      const sku  = skc.skuList[0] || {};
      const pic  = item.pictureUrl || '';
      const words= (item.productName||'').split(/\s+/);
      const title= words.slice(0,5).join(' ') + (words.length>5?'...':'');
      const daily= sku.dailyPrice!=null ? (sku.dailyPrice/100).toFixed(2) : '';
      const sug  = sku.suggestActivityPrice!=null ? (sku.suggestActivityPrice/100).toFixed(2) : '';
      const meet = (sku.suggestActivityPrice/100) >= cfg.priceVal ? '是' : '否';
      const stock= meet==='是' ? (cfg.stockVal||item.suggestActivityStock) : '';
      tb.innerHTML += `
        <tr>
          <td>
            <div class="product-cell">
              <img src="${pic}"/><div class="title" title="${item.productName}">${title}</div>
            </div>
          </td>
          <td>${skc.skcId}<br>货号:${sku.extCode||''}</td>
          <td>¥${daily}</td>
          <td>¥${sug}</td>
          <td>${meet}</td>
          <td>${stock}</td>
          <td>批量中…</td>
        </tr>`;
    });
  }

  // —— 抽屉逻辑（列表页 vs 详情页） —— 
  function fetchActivityData(){
    const longCon = document.getElementById('moduled-long');
    if(!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el=>{
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
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}"/></div>
        </div>`;
    });
  }
  async function fetchShortTermActivities(){
    const panels = [0,1,2].map(i=>document.getElementById('moduled-tab-'+i));
    const roots  = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if(roots.length<2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for(let i=0;i<tabs.length;i++){
      tabs[i].click(); await new Promise(r=>setTimeout(r,400));
      panels[i].innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row=>{
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        let type='', them='';
        try {
          const btn = row.querySelector('a[data-testid="beast-core-button-link"]');
          ({activityType:type, activityThematicId:them} = getReactProps(btn));
        } catch{}
        panels[i].innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div><div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}"/></div>
          </div>`;
      });
    }
  }

  function createDrawer(isDetail){
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id  = 'moduled-drawer';
    let html = `
      <h2>活动报名 V4.9.2 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">不低于固定值</option>
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
    d.innerHTML = html;
    document.body.appendChild(d);

    d.querySelector('#moduled-close').onclick = () => d.remove();
    d.querySelector('#moduled-price-mode').onchange = function(){
      document.getElementById('moduled-price-label').innerText =
        this.value==='profit' ? '利润率不低于' : '活动价格不低于';
    };

    if (!isDetail) {
      fetchActivityData();
      fetchShortTermActivities();
    }

    // 渲染首屏“立即报名+暂停”区和空表格
    renderSubmitPage({mode:'fixed',priceVal:0,stockVal:''});
  }

  function produceDrawer(){
    const p = location.pathname;
    const listPage   = /^\/activity\/marketing-activity\/?$/.test(p);
    const detailPage = p.includes('/detail-new');
    if(!listPage && !detailPage) {
      return alert('请打开营销活动列表或具体活动报名页面');
    }
    createDrawer(detailPage);
  }

  window.__moduled_plugin__ = produceDrawer;

})();

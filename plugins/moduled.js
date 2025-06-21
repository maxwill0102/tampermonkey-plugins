// ==UserScript==
// @name         活动报名插件 V4.8.2（列表/详情抽屉 + 新页面跳转）
// @namespace    https://yourdomain.com
// @version      4.8.2
// @description  列表页显示长期/短期活动并支持立即报名跳转；详情页仅显示设置并可跳转；其他页面弹提示
// @match        https://agentseller.temu.com/activity/marketing-activity*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 样式
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
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
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { padding:8px; text-align:left; border:1px solid #ddd; }
  `);

  // 从 React Fiber 节点拿 props
  function getReactProps(dom) {
    for (const k in dom) {
      if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
        const f = dom[k];
        return (f.return && f.return.memoizedProps) || (f._currentElement && f._currentElement.props);
      }
    }
    return {};
  }

  // 拉首批商品（测试用）
  function fetchProductsOnce(type, thematicId) {
    console.log(`📣 抓首批：type=${type}, thematicId=${thematicId}`);
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type':'application/json',
        'mallid':'634418223153529',
        'anti-content':'<请替换为你的 anti-content>',
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
        try {
          const d = JSON.parse(res.responseText);
          console.log('✅ 首批 matchList:', d.result.matchList);
        } catch(e) {
          console.error('❌ 解析失败', e);
        }
      },
      onerror(err) {
        console.error('❌ 请求失败', err);
      }
    });
  }

  // 渲染长期活动列表
  function fetchActivityData() {
    const longCon = document.getElementById('moduled-long');
    if (!longCon) return;
    longCon.innerHTML = '<div class="moduled-table-header"><div>类型</div><div>说明</div><div>选择</div></div>';
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(el => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim()||'';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim()||'';
      const goBtn = el.querySelector('a[data-testid="beast-core-button-link"]');
      let type='', them='';
      try { const p = getReactProps(goBtn); type = p.activityType; them = p.activityThematicId; } catch {}
      longCon.innerHTML += `
        <div class="moduled-table-row">
          <div>${name}</div>
          <div>${desc}</div>
          <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
        </div>`;
    });
  }

  // 渲染短期活动列表
  async function fetchShortTermActivities() {
    const panels = [0,1,2].map(i => document.getElementById('moduled-tab-'+i));
    const roots = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    if (roots.length < 2) return;
    const tabs = roots[1].querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].click();
      await new Promise(r => setTimeout(r, 400));
      const panel = panels[i];
      panel.innerHTML = '<div class="moduled-table-header"><div>主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>选择</div></div>';
      document.querySelectorAll('[data-testid="beast-core-table-body-tr"]').forEach(row => {
        const txt = row.querySelector('[data-testid="beast-core-table-td"]')?.innerText.trim()||'';
        const goBtn = row.querySelector('a[data-testid="beast-core-button-link"]');
        let type='', them='';
        try { const p = getReactProps(goBtn); type = p.activityType; them = p.activityThematicId; } catch {}
        panel.innerHTML += `
          <div class="moduled-table-row">
            <div>${txt}</div>
            <div>–</div><div>–</div><div>–</div>
            <div><input type="radio" name="activity" data-type="${type}" data-thematicid="${them}" /></div>
          </div>`;
      });
    }
  }

  // 渲染“报名详情”视图
  function renderSubmitPage(config) {
    const drawer = document.getElementById('moduled-drawer');
    drawer.innerHTML = `
      <h2>报名详情 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <p>价格方式：${config.mode==='profit'?'利润率不低于':'价格不低于固定值'} ${config.priceVal}</p>
        <p>活动库存：${config.stockVal||'默认'}</p>
      </div>
      <div class="moduled-section">
        <p>当前活动：${config.current||1} / ${config.total}</p>
        <p>报名成功：${config.success||0} / ${config.attempt||0}</p>
        <p>未报名数量：${(config.attempt - config.success)||0}</p>
      </div>
      <div class="moduled-section">
        <table>
          <thead class="moduled-table-header"><tr>
            <th>商品标题</th><th>SKC</th><th>日常价格</th><th>活动申报价</th><th>是否满足条件</th><th>活动库存</th><th>是否成功</th>
          </tr></thead>
          <tbody id="product-rows">
            <tr><td colspan="7" align="center">等待数据填充...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="moduled-section" style="text-align:center">
        <button id="moduled-pause">暂停</button>
      </div>
    `;
    // 关闭返回主界面
    drawer.querySelector('#moduled-close').onclick = () => produceDrawer();
  }

  // 构建抽屉
  function createDrawer(isDetail) {
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';
    let html = `
      <h2>活动报名 V4.8.2 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode"><option value="fixed">不低于固定值</option><option value="profit">利润率不低于</option></select>
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
    d.querySelector('#moduled-price-mode').onchange = function(){
      d.querySelector('#moduled-price-label').textContent = this.value==='profit'?'利润率不低于':'活动价格不低于';
    };

    if (!isDetail) {
      // 切 tab
      d.querySelectorAll('.moduled-tab').forEach(tab => tab.onclick = ()=>{
        d.querySelectorAll('.moduled-tab, .moduled-tab-panel').forEach(e=>e.classList.remove('active'));
        tab.classList.add('active');
        d.querySelector('#moduled-tab-'+tab.dataset.tab).classList.add('active');
      });
      fetchActivityData();
      fetchShortTermActivities();
      d.querySelector('#moduled-submit').onclick = () => {
        const mode = d.querySelector('#moduled-price-mode').value;
        const priceVal = d.querySelector('#moduled-price-input').value.trim();
        if (!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        const sel = d.querySelector('input[name="activity"]:checked');
        if (!sel) return alert('请先选择活动');
        const type = sel.dataset.type;
        const them = sel.dataset.thematicid;
        // 进入详情视图
        renderSubmitPage({ mode, priceVal, stockVal, current:1, total:1, success:0, attempt:0 });
        // 抓首批
        fetchProductsOnce(type, them);
      };
    } else {
      d.querySelector('#moduled-submit').onclick = () => {
        const mode = d.querySelector('#moduled-price-mode').value;
        const priceVal = d.querySelector('#moduled-price-input').value.trim();
        if (!priceVal) return alert('请填写活动价格');
        const stockVal = d.querySelector('#moduled-stock-input').value.trim();
        renderSubmitPage({ mode, priceVal, stockVal, current:1, total:1, success:0, attempt:0 });
        const params = new URLSearchParams(location.search);
        const type = params.get('type')||'13';
        const them = params.get('thematicId')||params.get('thematicid');
        fetchProductsOnce(type, them);
      };
    }
  }

  // 入口：判断列表/详情/其它
  function produceDrawer() {
    const path = location.pathname;
    const isList = /^\/activity\/marketing-activity\/?$/.test(path);
    const isDetail = path.includes('/detail-new');
    if (!isList && !isDetail) {
      alert('请打开营销活动列表或具体活动报名页面');
      return;
    }
    createDrawer(isDetail);
  }

  // 暴露给控制台或按钮触发
  window.__moduled_plugin__ = produceDrawer;
})();

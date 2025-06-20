// ==UserScript==
// @name         活动报名插件 V4.8（支持详情页自动抓取）
// @namespace    https://yourdomain.com
// @version      4.8.0
// @description  列表页抽屉 + 详情页自动抓首批商品
// @match        https://agentseller.temu.com/activity/marketing-activity/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function(){
  'use strict';

  // 通用：fetch 第一批商品数据
  function fetchProductsOnce(type, thematicId){
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
      onload(res){
        try {
          const d = JSON.parse(res.responseText);
          console.log('✅ 首批 matchList:', d.result.matchList);
        } catch(e){
          console.error('❌ JSON 解析失败', e);
        }
      },
      onerror(err){
        console.error('❌ 请求失败', err);
      }
    });
  }

  // 如果当前在 detail-new 报名详情页，就直接抓取
  if (location.pathname.includes('/detail-new')) {
    const params = new URLSearchParams(location.search);
    const type = params.get('type') || '13';
    const them = params.get('thematicId') || params.get('thematicid');
    if (!them) {
      console.error('❌ 无法从 URL 解析 thematicId');
    } else {
      // 直接拉一次首批，不需要抽屉
      fetchProductsOnce(type, them);
    }
    return;  // 不再执行下面的抽屉代码
  }

  // 否则：原列表页，初始化抽屉 UI（V4.7 内容简化版）
  GM_addStyle(`
    #moduled-drawer { position:fixed; top:0; right:0; width:780px; height:100%; background:#fff; border-left:1px solid #ccc; z-index:999999; overflow-y:auto; font-family:Arial; box-shadow:-2px 0 8px rgba(0,0,0,0.2); }
    #moduled-close { position:absolute; top:10px; right:10px; cursor:pointer; }
    .moduled-section { padding:16px; border-bottom:1px solid #eee; }
    .moduled-input-group { margin:16px; }
  `);

  function createDrawer(){
    document.getElementById('moduled-drawer')?.remove();
    const d = document.createElement('div');
    d.id = 'moduled-drawer';
    d.innerHTML = `
      <h2>活动报名 V4.8 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <label>价格模式</label>
        <select id="price-mode"><option value="fixed">不低于固定值</option><option value="profit">利润率不低于</option></select>
        <input id="price-val" placeholder="填写价格或百分比" />
      </div>
      <div class="moduled-section"><strong>操作说明：</strong><br>
        1. 在原生列表页点击“去报名”按钮弹出详情，再点击弹窗中的“立即报名”后页面跳转到详情页。<br>
        2. 详情页脚本会自动抓取首批商品并打印到控制台。<br>
      </div>
    `;
    document.body.appendChild(d);
    d.querySelector('#moduled-close').onclick = ()=>d.remove();
  }

  // 暴露插件入口
  window.__moduled_plugin__ = createDrawer;
})();

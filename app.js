'use strict';
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₸';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const findProduct = id => products.find(product => product.id === id);
let storageAvailable = true;
function readStorage(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function saveStorage(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { storageAvailable=false; return false; } }
const savedCart = readStorage('vkusnyashka-cart', {});
let cart = {};
if (savedCart && typeof savedCart === 'object' && !Array.isArray(savedCart)) {
  for (const [id,qty] of Object.entries(savedCart)) if (findProduct(id) && Number.isInteger(qty) && qty > 0) cart[id]=Math.min(qty,99);
}
let category='all', query='', sort='popular', toastTimer, visibleLimit=12, priceLimit=0, prepFilter=0, onlyFavorites=false;
const storedFavorites=readStorage('iloshka-favorites',[]);
const favorites=new Set(Array.isArray(storedFavorites)?storedFavorites.filter(id=>findProduct(id)):[]);
function productImage(p,extra='') { return `<span class="food-photo ${extra}" role="img" aria-label="${escapeHTML(p.name)}" style="--atlas:url('assets/catalog-${p.atlas}.png');--x:${p.cell%3*50}%;--y:${Math.floor(p.cell/3)*50}%"></span>`; }
function renderCategories() {
  const categoryList=[['all','Всё меню'],...Object.entries(categoryNames)];
  $('#categories').innerHTML=categoryList.map(([id,name])=>`<button data-category="${id}" aria-pressed="${category===id}" class="${category===id?'selected':''}"><span>${name}</span><b>${id==='all'?products.length:products.filter(p=>p.category===id).length}</b></button>`).join('');
  const preview={cakes:'pistachio',pastries:'eclair',desserts:'tiramisu',bakery:'almond',cookies:'cookies',sets:'macaron-box'};
  $('#category-tiles').innerHTML=Object.entries(categoryNames).map(([id,name])=>`<button class="category-tile" data-category="${id}" data-jump>${productImage(findProduct(preview[id]))}<span>${name}</span><small>${products.filter(p=>p.category===id).length} в меню <b>↗</b></small></button>`).join('');
  updateFavoriteCount();
}
function updateFavoriteCount(){ $('#favorites-count').textContent=favorites.size; $('#header-favorites').setAttribute('aria-pressed',String(onlyFavorites)); $('#mobile-favorites').setAttribute('aria-pressed',String(onlyFavorites)); }
function resetFilters(){category='all';query='';priceLimit=0;prepFilter=0;onlyFavorites=false;visibleLimit=12;$('#search').value='';$('#price-filter').value='0';$('#prep-filter').value='0';$('#favorites-filter').checked=false;renderCategories();renderProducts();}
const cartCount = () => Object.values(cart).reduce((sum,qty)=>sum+qty,0);
const cartTotal = () => Object.entries(cart).reduce((sum,[id,qty])=>sum+findProduct(id).price*qty,0);
function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800); }
function renderProducts() {
  let list=products.filter(p=>(category==='all'||p.category===category)&&`${p.name} ${p.description} ${p.ingredients}`.toLocaleLowerCase('ru').includes(query)&&(!priceLimit||p.price<=priceLimit)&&(!prepFilter||p.lead===prepFilter)&&(!onlyFavorites||favorites.has(p.id)));
  if(sort==='price-up') list.sort((a,b)=>a.price-b.price);
  if(sort==='price-down') list.sort((a,b)=>b.price-a.price);
  if(sort==='calories')list.sort((a,b)=>a.kcal-b.kcal);
  const filtered=category!=='all'||query||priceLimit||prepFilter||onlyFavorites;
  const filterCount=Number(Boolean(priceLimit))+Number(Boolean(prepFilter))+Number(onlyFavorites);
  $('#filter-count').textContent=filterCount; $('#filter-count').hidden=!filterCount;
  $('#result-count').textContent=`${category==='all'?'Всё меню':categoryNames[category]} · ${list.length} изделий`;
  $('#active-filters').innerHTML=filtered?`<span>Выбрано: ${[query?`«${escapeHTML(query)}»`:null,priceLimit?`до ${money(priceLimit)}`:null,prepFilter?`от ${prepFilter} ч`:null,onlyFavorites?'избранное':null].filter(Boolean).join(' · ')||categoryNames[category]}</span><button id="reset-filters">Сбросить ×</button>`:'';
  $('#products').innerHTML=list.length ? list.slice(0,visibleLimit).map(p=>`<article class="product-card"><div class="product-visual"><button class="product-image-button" data-product="${p.id}" aria-label="${p.name}: состав и пищевая ценность">${productImage(p)}<span class="image-hint">Состав и БЖУ ↗</span></button><span class="product-badge ${p.lead===24?'cake-badge':''}">${p.badge}</span><button class="favorite-button ${favorites.has(p.id)?'saved':''}" data-favorite="${p.id}" aria-pressed="${favorites.has(p.id)}" aria-label="${favorites.has(p.id)?'Убрать из избранного':'В избранное'}: ${p.name}"><svg class="icon"><use href="#i-heart"/></svg></button></div><div class="product-info"><div class="product-title-row"><h3><button class="product-title" data-product="${p.id}">${p.name}</button></h3></div><p class="product-description">${p.description}</p><div class="product-meta"><span>${p.weight} г</span><i>·</i><span>${p.kcal} ккал / 100 г</span></div><div class="product-bottom"><div><strong class="price">${money(p.price)}</strong><small>${p.portions}</small></div><button class="add-button" data-add="${p.id}" aria-label="Добавить ${p.name} в корзину"><span>+</span> В корзину</button></div><div class="product-ready"><span></span>Приготовление от ${p.lead} ${p.lead===2?'часов':'часов'}</div></div></article>`).join('') : `<div class="empty-results"><svg class="icon"><use href="#${onlyFavorites?'i-heart':'i-search'}"/></svg><h3>${onlyFavorites?'Здесь будут ваши любимые':'Ничего не нашлось'}</h3><p>${onlyFavorites?'Нажмите на сердечко в карточке десерта.':'Попробуйте изменить запрос или условия поиска.'}</p><button class="button secondary" id="reset-filters">Показать всё меню</button></div>`;
  $('#load-more').hidden=list.length<=visibleLimit;
  $('#visible-count').textContent=list.length?`Показано ${Math.min(visibleLimit,list.length)} из ${list.length}`:'';
  updateFavoriteCount();
}
function syncCart() {
  saveStorage('vkusnyashka-cart',cart);
  const count=cartCount(), label=`Открыть корзину, изделий: ${count}`;
  $('#cart-count').textContent=count; $('#open-cart').setAttribute('aria-label',label);
  $('#mobile-cart-count').textContent=count; $('#mobile-cart-total').textContent=count?money(cartTotal()):'Выберите десерт';
  $('#mobile-cart').setAttribute('aria-label',`${label}${count?`, сумма ${money(cartTotal())}`:''}`);
  if($('#cart-dialog').open) renderCart();
}
function addToCart(id) { const p=findProduct(id); if(!p)return; if((cart[id]||0)>=99){toast('Можно добавить не больше 99 одинаковых изделий');return;} cart[id]=(cart[id]||0)+1; syncCart(); document.querySelectorAll(`[data-add="${id}"]`).forEach(b=>{b.innerHTML=`<span>✓</span> В корзине · ${cart[id]}`;}); toast(storageAvailable ? `${p.name} — в корзине` : 'Добавлено в корзину. Браузер не разрешает сохранение после закрытия.'); }
function openDialog(id) { const dialog=$(id); if(!dialog.open)dialog.showModal(); }
function showProduct(id) {
  const p=findProduct(id); if(!p)return;
  $('#product-detail').innerHTML=`<div class="product-detail-layout">
    <div class="detail-scroll">
      <figure class="detail-media">
        ${productImage(p,'detail-photo')}
        <figcaption><span class="detail-photo-tag">${p.badge}</span><span>${p.weight} г · ${p.portions}</span></figcaption>
      </figure>
      <div class="detail-content">
        <p class="eyebrow">${categoryNames[p.category]}</p><h2 id="detail-title" tabindex="-1">${p.name}</h2><p class="detail-description">${p.description}</p>
        <h3>Что внутри</h3><p class="ingredients">${p.ingredients}</p>
        <p class="allergens"><strong>Аллергены:</strong> ${p.allergens}<br>Все изделия производятся на общей кухне; возможны следы других аллергенов.</p>
        <h3>Пищевая ценность на 100 г</h3><div class="nutrition"><div><strong>${p.kcal}</strong><span>ккал</span></div><div><strong>${p.protein} г</strong><span>белки</span></div><div><strong>${p.fat} г</strong><span>жиры</span></div><div><strong>${p.carbs} г</strong><span>углеводы</span></div></div>
        <p class="nutrition-note">Демонстрационная рецептура и пищевая ценность. Перед реальным заказом уточните состав у кондитера.</p>
        <div class="detail-pickup"><svg class="icon"><use href="#i-clock"/></svg><p><strong>Приготовим от ${p.lead} часов</strong><span>Самовывоз · Астана, ЖК «Времена года»</span></p></div>
      </div>
    </div>
    <div class="detail-bottom"><div><small>Стоимость</small><strong class="price">${money(p.price)}</strong></div><button class="button primary" data-add="${p.id}">В корзину <span>+</span></button></div>
  </div>`;
  openDialog('#product-dialog');
  $('#detail-title').focus({preventScroll:true});
}
function renderCart() {
  $('#drawer-count').textContent=cartCount()?`(${cartCount()})`:'';
  if(!cartCount()) { $('#cart-content').innerHTML='<div class="empty-cart"><span>♡</span><h3>Здесь будет ваше любимое</h3><p>Добавьте немного счастья из каталога.<br>Мы уже приготовили кое-что вкусное.</p><button class="button primary" id="choose-desserts">Выбрать десерт <span>↗</span></button></div>';return; }
  $('#cart-content').innerHTML=Object.entries(cart).map(([id,qty])=>{const p=findProduct(id);return `<article class="cart-item">${productImage(p)}<div><h3>${p.name}</h3><small>${p.weight} г · ${money(p.price)} / шт.</small><div class="quantity"><button data-quantity="${id}" data-delta="-1" aria-label="Уменьшить количество: ${p.name}">−</button><span aria-label="Количество">${qty}</span><button data-quantity="${id}" data-delta="1" aria-label="Увеличить количество: ${p.name}" ${qty>=99?'disabled':''}>+</button></div></div><div class="cart-item-end"><strong>${money(p.price*qty)}</strong><button class="remove-item" data-remove="${id}" aria-label="Удалить ${p.name}">Удалить</button></div></article>`;}).join('')+`<div class="cart-summary"><p><span>Итого</span><strong>${money(cartTotal())}</strong></p><small>Самовывоз: Астана, ЖК «Времена года»<br>Оплата при получении · без стоимости доставки</small><button class="button primary full" id="checkout-button">Перейти к оформлению <span>↗</span></button><p class="demo-small">Пробный заказ без отправки в кондитерскую</p></div>`;
}
function astanaDate(date=new Date()) { const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date); const get=t=>parts.find(p=>p.type===t).value; return `${get('year')}-${get('month')}-${get('day')}`; }
function minimumPickup() { return Date.now()+Math.max(2,...Object.keys(cart).map(id=>findProduct(id).lead))*3600000; }
function updateTimes() {
  const select=$('#pickup-time'), previous=select.value, day=$('#pickup-date').value, minimum=minimumPickup();
  select.innerHTML='';
  for(let hour=9;hour<20;hour++) for(const minute of ['00','30']) { const time=`${String(hour).padStart(2,'0')}:${minute}`; const stamp=new Date(`${day}T${time}:00+05:00`).getTime(); if(stamp>=minimum)select.add(new Option(time,time)); }
  if(!select.options.length){select.add(new Option('Нет свободного времени',''));$('#form-error').textContent='На эту дату время уже недоступно. Выберите следующий день.';}
  else {if([...select.options].some(o=>o.value===previous))select.value=previous;$('#form-error').textContent='';}
}
function startCheckout() {
  if(!cartCount())return;
  $('#cart-dialog').close();$('#checkout-form').reset();$('#form-error').textContent='';
  const earliest=minimumPickup(), day=$('#pickup-date');day.min=astanaDate(new Date(earliest));day.max=astanaDate(new Date(Date.now()+30*86400000));day.value=day.min;updateTimes();
  if(!$('#pickup-time').value){day.value=astanaDate(new Date(new Date(`${day.value}T12:00:00+05:00`).getTime()+86400000));updateTimes();}
  $('#checkout-total').textContent=money(cartTotal());openDialog('#checkout-dialog');
}
document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.hasAttribute('data-close')){target.closest('dialog').close();return;}
  if(target.dataset.product){showProduct(target.dataset.product);return;}
  if(target.dataset.add){addToCart(target.dataset.add);return;}
  if(target.dataset.favorite){const id=target.dataset.favorite;if(favorites.has(id))favorites.delete(id);else favorites.add(id);saveStorage('iloshka-favorites',[...favorites]);renderProducts();return;}
  if(target.dataset.category){category=target.dataset.category;visibleLimit=12;document.querySelectorAll('#categories [data-category]').forEach(b=>{const selected=b.dataset.category===category;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});renderProducts();if(target.hasAttribute('data-jump'))$('#catalog').scrollIntoView({behavior:'smooth'});return;}
  if(target.dataset.quantity){const id=target.dataset.quantity;cart[id]=Math.max(0,Math.min(99,(cart[id]||0)+Number(target.dataset.delta)));if(!cart[id])delete cart[id];syncCart();return;}
  if(target.dataset.remove){delete cart[target.dataset.remove];syncCart();return;}
  if(target.id==='reset-filters'||target.id==='clear-filters')resetFilters();
  if(target.id==='choose-desserts'){$('#cart-dialog').close();$('#catalog').scrollIntoView({behavior:'smooth'});}
  if(target.id==='checkout-button')startCheckout();
});
let searchScrollTimer;
$('#search').addEventListener('input',event=>{query=event.target.value.trim().toLocaleLowerCase('ru');visibleLimit=12;renderProducts();clearTimeout(searchScrollTimer);searchScrollTimer=setTimeout(()=>$('#catalog').scrollIntoView({behavior:'smooth'}),450);});
$('#sort').addEventListener('change',event=>{sort=event.target.value;visibleLimit=12;renderProducts();});
$('#price-filter').addEventListener('change',event=>{priceLimit=Number(event.target.value);visibleLimit=12;renderProducts();});
$('#prep-filter').addEventListener('change',event=>{prepFilter=Number(event.target.value);visibleLimit=12;renderProducts();});
$('#favorites-filter').addEventListener('change',event=>{onlyFavorites=event.target.checked;visibleLimit=12;renderProducts();});
$('#header-favorites').addEventListener('click',()=>{const next=!onlyFavorites;resetFilters();onlyFavorites=next;$('#favorites-filter').checked=onlyFavorites;renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});});
$('#load-more').addEventListener('click',()=>{visibleLimit+=12;renderProducts();});
$('#open-cart').addEventListener('click',()=>{renderCart();openDialog('#cart-dialog');});
$('#mobile-cart').addEventListener('click',()=>{renderCart();openDialog('#cart-dialog');});
$('#mobile-favorites').addEventListener('click',()=>$('#header-favorites').click());
$('#toggle-filters').addEventListener('click',()=>{
  const expanded=$('#toggle-filters').getAttribute('aria-expanded')!=='true';
  $('#toggle-filters').setAttribute('aria-expanded',String(expanded));
  $('#filter-panel').classList.toggle('filters-open',expanded);
});
$('#pickup-date').addEventListener('change',updateTimes);
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
$('#checkout-form').addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
  const data=new FormData(form), name=data.get('name').trim(), phone=data.get('phone').replace(/\D/g,'');
  if(name.length<2){$('#form-error').textContent='Укажите имя — минимум 2 символа.';return;}
  if(!/^[78]\d{10}$/.test(phone)){$('#form-error').textContent='Укажите телефон: +7 и 10 цифр, например +7 (701) 123-45-67.';form.elements.phone.focus();return;}
  const pickup=`${data.get('date')}T${data.get('time')}:00+05:00`, stamp=new Date(pickup).getTime();
  if(!cartCount()){$('#form-error').textContent='Корзина пуста. Добавьте десерт.';return;}
  if(!Number.isFinite(stamp)||stamp<minimumPickup()||data.get('date')>$('#pickup-date').max||!/^((09|1[0-9]):(00|30))$/.test(data.get('time'))){$('#form-error').textContent='Выберите доступное время с учётом приготовления заказа.';return;}
  const order={number:`ИЛ-${Date.now().toString().slice(-6)}`,created:new Date().toISOString(),name,phone,pickup,comment:data.get('comment').trim(),items:Object.entries(cart).map(([id,quantity])=>({id,name:findProduct(id).name,price:findProduct(id).price,quantity})),total:cartTotal(),demo:true};
  const prior=readStorage('vkusnyashka-orders',[]);const saved=saveStorage('vkusnyashka-orders',[...(Array.isArray(prior)?prior:[]).slice(-19),order]);
  if(!saved){$('#form-error').textContent='Не удалось сохранить пробный заказ. Разрешите локальное хранилище браузера и повторите. Корзина сохранена в текущей вкладке.';return;}
  const pickupLabel=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(pickup));
  $('#success-content').innerHTML=`<p class="order-number">Пробный заказ № ${order.number}</p><div class="order-summary"><strong>${escapeHTML(name)}, ваш выбор сохранён.</strong><br>Самовывоз: ${pickupLabel}, время Астаны<br>Астана, ЖК «Времена года»<br>Изделий: ${cartCount()} · Итого: <strong>${money(order.total)}</strong></div><p class="order-demo">Это демонстрация оформления. Заказ сохранён в вашем браузере; кондитерская его не получила и не начала приготовление.</p>`;
  cart={};syncCart();$('#checkout-dialog').close();form.reset();openDialog('#success-dialog');
});
$('#back-to-catalog').addEventListener('click',()=>{$('#success-dialog').close();$('#catalog').scrollIntoView({behavior:'smooth'});});
$('#demo-info').addEventListener('click',()=>openDialog('#info-dialog'));
$('#clear-personal-data').addEventListener('click',()=>{try{localStorage.removeItem('vkusnyashka-orders');$('#privacy-status').textContent='Сохранённые заказы и контактные данные удалены.';}catch{$('#privacy-status').textContent='Хранилище браузера недоступно.'}});
$('#year').textContent=new Date().getFullYear();renderCategories();renderProducts();syncCart();




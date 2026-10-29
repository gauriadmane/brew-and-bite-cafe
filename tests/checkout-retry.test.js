const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const customerSource = fs.readFileSync(path.join(__dirname, '..', 'public/js/customer.js'), 'utf8');
const ID = '507f1f77bcf86cd799439011';
const TABLE = '507f1f77bcf86cd799439022';

async function testPage({page = 'checkout', method = 'card', cartEmpty = false, failSetup = false, verification = {confirmed: true}, query = ''} = {}) {
  let cart = cartEmpty ? [] : [{id: ID, name: 'Test Coffee', qty: 1, pricePaise: 32000, imageKey: 'coffee'}];
  let ordersCreated = 0;
  let previewCalls = 0;
  let gatewayOptions = null;
  let gatewayOpen = false;
  const calls = [];
  const els = new Map();
  const el = (id) => {
    if (!els.has(id)) els.set(id, {id, value: '', className: '', textContent: '', innerHTML: '', disabled: false});
    return els.get(id);
  };
  const radios = ['cash', 'upi', 'card'].map(value => ({value, checked: value === method, disabled: false}));
  const location = {
    href: '', search: query, hash: '', pathname: '/' + page + '.html', redirectedTo: null,
    replace(destination) {this.redirectedTo = destination;}
  };
  class Razorpay {
    constructor(options) {gatewayOptions = options;}
    open() {gatewayOpen = true;}
  }
  const api = async (url, options = {}) => {
    calls.push(url);
    if (url === '/tables') return {tables: [{_id: TABLE, number: 'T1', available: true}]};
    if (url === '/payment-options') return {onlineAvailable: true};
    if (url === '/orders/preview') {
      previewCalls++;
      assert.ok(options.body.items.length > 0, 'empty preview must never reach API');
      return {items: [{name: 'Test Coffee', quantity: 1, lineTotalPaise: 32000}], subtotalPaise: 32000, discountPaise: 0, taxPaise: 0, taxBps: 0, totalPaise: 32000};
    }
    if (url === '/orders' && options.method === 'POST') {
      ordersCreated++;
      assert.equal(options.body.items.length, 1);
      return {order: {_id: ID, orderNumber: 'BB-TEST', paymentMethod: method}};
    }
    if (url === '/orders') return {orders: []};
    if (url === `/payments/${ID}/create`) {
      if (failSetup) throw new Error('Gateway temporarily unavailable');
      return {keyId: 'rzp_test_example', amount: 32000, providerOrderId: 'order_test'};
    }
    if (url === `/payments/${ID}/verify`) return verification;
    throw new Error('Unexpected mocked request: ' + url);
  };
  const sandbox = {
    window: {Razorpay}, Razorpay,
    document: {body: {dataset: {page}}, querySelectorAll: () => radios, querySelector: () => radios.find(r => r.checked), getElementById: el, visibilityState: 'visible'},
    location, URL, URLSearchParams, Intl, Date, Number, Math, String, Object, Array,
    setInterval: () => 1, setTimeout: () => 1, console,
  };
  let pageHtml = '';
  sandbox.window.BB = {
    ready: Promise.resolve(), state: {user: {role: 'customer', name: 'Test Customer', email: 'test@example.test'}},
    requireRole: async () => ({role: 'customer'}), api, esc: x => String(x), money: n => String(n),
    toast: () => {}, setApp: html => {pageHtml = html;}, heading: () => '<h1>Test</h1>',
    productCard: () => '', bindProducts: () => {}, basket: () => cart,
    saveBasket: next => {cart = next;}, byId: el, safeDate: () => '', status: () => '', menuImageSrc: () => ''
  };
  vm.createContext(sandbox);
  vm.runInContext(customerSource, sandbox, {filename: 'customer.js'});
  for (let i = 0; i < 8; i++) await new Promise(setImmediate);
  el('table').value = TABLE;
  return {
    el, location, radios, calls, get cart() {return cart;}, get pageHtml() {return pageHtml;},
    get ordersCreated() {return ordersCreated;}, get previewCalls() {return previewCalls;},
    get gatewayOptions() {return gatewayOptions;}, get gatewayOpen() {return gatewayOpen;},
    submit: () => el('checkout-form').onsubmit({preventDefault() {}}),
  };
}

test('closing Razorpay redirects to My Orders without submitting an empty cart', async () => {
  const p = await testPage();
  await p.submit();
  assert.equal(p.ordersCreated, 1);
  assert.equal(p.cart.length, 0);
  assert.equal(p.gatewayOpen, true);
  assert.equal(p.location.redirectedTo, null);
  p.gatewayOptions.modal.ondismiss();
  assert.equal(p.location.redirectedTo, '/orders.html?payment=pending');
  const oldPreviews = p.previewCalls;
  await p.el('table').onchange();
  assert.equal(p.previewCalls, oldPreviews, 'changing payment/table after gateway dismissal must not hit preview API');
  await p.submit();
  assert.equal(p.ordersCreated, 1, 'form cannot create a duplicate order after pending payment');
});

test('verified Razorpay success navigates to order history and dismiss cannot overwrite it', async () => {
  const p = await testPage({method: 'upi'});
  await p.submit();
  await p.gatewayOptions.handler({razorpay_order_id:'order_test', razorpay_payment_id:'pay_test', razorpay_signature:'signature'});
  assert.equal(p.location.redirectedTo, '/orders.html?payment=success');
  p.gatewayOptions.modal.ondismiss();
  assert.equal(p.location.redirectedTo, '/orders.html?payment=success');
});

test('Razorpay verification requiring review is not shown as successful', async () => {
  const p = await testPage({verification: {requiresReview: true}});
  await p.submit();
  await p.gatewayOptions.handler({razorpay_order_id:'order_test', razorpay_payment_id:'pay_test', razorpay_signature:'signature'});
  assert.equal(p.location.redirectedTo, '/orders.html?payment=review');
});

test('failure to create gateway checkout redirects to existing order for retry', async () => {
  const p = await testPage({failSetup: true});
  await p.submit();
  assert.equal(p.ordersCreated, 1);
  assert.equal(p.location.redirectedTo, '/orders.html?payment=retry');
});

test('an empty-cart checkout does not attempt a new order', async () => {
  const p = await testPage({cartEmpty: true});
  assert.equal(p.location.href, '/cart.html');
  assert.equal(p.ordersCreated, 0);
});

test('order history shows helpful notice for interrupted checkout', async () => {
  const p = await testPage({page: 'orders', query: '?payment=pending'});
  assert.match(p.pageHtml, /Your online order is saved/);
  assert.match(p.pageHtml, /Pay now/);
});

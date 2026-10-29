// Pure functions: no database required. All money is stored as integer paise.
function discountForOffer(offer, lineItems, subtotalPaise) {
  if (!offer || subtotalPaise<offer.minimumPaise) return 0;
  if (offer.type==='percent') return Math.min(subtotalPaise,Math.floor(subtotalPaise*offer.value/100));
  if (offer.type==='fixed') return Math.min(subtotalPaise,offer.value);
  if (offer.type==='combo') {
    if (!offer.comboItems.length) return 0;
    const counts=offer.comboItems.map(req=>{
      const line=lineItems.find(x=>String(x.menuItem)===String(req.menuItem));
      return line?Math.floor(line.quantity/req.quantity):0;
    });
    const bundles=Math.min(...counts);
    if (!Number.isFinite(bundles)||bundles<=0) return 0;
    const regular=offer.comboItems.reduce((sum,req)=>{
      const line=lineItems.find(x=>String(x.menuItem)===String(req.menuItem));
      return sum+(line?.unitPricePaise||0)*req.quantity;
    },0);
    return Math.min(subtotalPaise,Math.max(0,regular-offer.comboPricePaise)*bundles);
  }
  return 0;
}
function computeTotals(lines, offer, bps) {
  const subtotalPaise=lines.reduce((sum,x)=>sum+x.unitPricePaise*x.quantity,0);
  const discountPaise=discountForOffer(offer,lines,subtotalPaise);
  const taxPaise=Math.round((subtotalPaise-discountPaise)*bps/10000);
  return {subtotalPaise,discountPaise,taxPaise,totalPaise:subtotalPaise-discountPaise+taxPaise,taxBps:bps};
}
module.exports={discountForOffer,computeTotals};

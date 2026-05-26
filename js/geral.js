function getCart() {
  const cart = JSON.parse(localStorage.getItem("heeeph_cart")) || [];
  return Array.isArray(cart) ? cart : [];
}

function updateCartCount() {
  const cart = getCart();

  const total = cart.reduce((acc, item) => {
    const qtd = Number(item.quantidade || item.quantity || 1);
    return acc + (isNaN(qtd) ? 1 : qtd);
  }, 0);

  const countEl = document.getElementById("cartCount");

  if (countEl) {
    countEl.textContent = total;
  }
}

updateCartCount();
"use strict";

let itemList = [];
let basketList = [];

/* -----------------------------------------
   Toastr Ayarları
----------------------------------------- */
if (typeof toastr !== "undefined") {
  toastr.options = {
    closeButton: false,
    debug: false,
    newestOnTop: false,
    progressBar: false,
    positionClass: "toast-bottom-right",
    preventDuplicates: false,
    onclick: null,
    showDuration: "300",
    hideDuration: "1000",
    timeOut: "5000",
    extendedTimeOut: "1000",
    showEasing: "swing",
    hideEasing: "linear",
    showMethod: "fadeIn",
    hideMethod: "fadeOut",
  };
} else {
  console.error("Toastr is not defined");
}

/* -----------------------------------------
   Yardımcı Fonksiyonlar
----------------------------------------- */
const toggleModal = () => {
  const basketModalEl = document.querySelector(".basket__modal");
  if (basketModalEl) basketModalEl.classList.toggle("active");
};

const toggleSearchBox = () => {
  const searchBoxEl = document.getElementById("search-box");
  if (searchBoxEl) searchBoxEl.classList.toggle("active");
};

/* -----------------------------------------
   Ürün ve Sepet İşlemleri
----------------------------------------- */
// Ürünleri getir ve listele
const getItems = () => {
  fetch("http://localhost:5000/items")
    .then((res) => res.json())
    .then((items) => {
      itemList = items;
      if (itemList.length) {
        createItemItemsHtml();
        createItemCategoriesHtml();
      } else {
        console.error("No items found");
      }
    })
    .catch((error) => console.error("Error fetching items:", error));
};

// Sepet öğelerini getir
const getBasketItems = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("User is not logged in. Skipping basket fetch.");
    return;
  }

  fetch("http://localhost:5000/basket", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then((items) => {
      basketList = items;
      listBasketItems();
      fetchTotalPrice();
    })
    .catch((error) => console.error("Error fetching basket items:", error));
};

// Yıldız değerlendirme HTML'ini oluştur
const createItemStars = (starRate) => {
  let starRateHtml = "";
  for (let i = 1; i <= 5; i++) {
    starRateHtml += Math.round(starRate) >= i
      ? `<i class="bi bi-star-fill active"></i>`
      : `<i class="bi bi-star-fill"></i>`;
  }
  return starRateHtml;
};

// Ürün kartlarını oluştur ve ekrana yazdır
const createItemItemsHtml = (filteredItems = itemList) => {
  const itemListEl = document.querySelector(".item__list");
  if (!itemListEl) {
    console.error("Item list element not found");
    return;
  }

  let itemListHtml = "";
  filteredItems.forEach((item, index) => {
    itemListHtml += `
      <div class="col-5 ${index % 2 === 0 ? "offset-2" : ""} my-5">
        <div class="row item__card">
          <div class="col-6">
            <img class="img-fluid shadow" src="${item.imgSource}" width="258" height="400" />
          </div>
          <div class="col-6 d-flex flex-column justify-content-between">
            <div class="item__detail">
              <span class="fos gray fs-5">${item.category}</span><br />
              <span class="fs-4 fw-bold">${item.name}</span><br />
              <span class="item__star-rate">
                ${createItemStars(item.starRate)}
                <span class="gray">${item.reviewCount} reviews</span>
              </span>
            </div>
            <p class="item__description fos gray">${item.description}</p>
            <div>
              <span class="black fw-bold fs-4 me-2">${item.price}₺</span>
              ${item.old_price ? `<span class="fs-4 fw-bold old__price">${item.old_price}</span>` : ""}
            </div>
            <button class="btn__purple" onclick="addItemToBasket(${item.item_id})">
              ADD TO BASKET
            </button>
          </div>
        </div>
      </div>`;
  });
  itemListEl.innerHTML = itemListHtml;
};

// Kategori isimleri eşlemeleri
const ITEM_CATEGORIES = {
  ALL: "Tümü",
  TECHNOLOGIES: "Technologies",
  WEAR: "Wear",
  SPORTS: "Sports",
  SHOESBAGS: "Shoes & Bags",
};

// Kategori filtreleme butonlarını oluştur
const createItemCategoriesHtml = () => {
  const filterEl = document.querySelector(".filter");
  if (!filterEl) {
    console.error("Filter element not found");
    return;
  }

  let filterCategories = ["ALL"];
  itemList.forEach((item) => {
    if (!filterCategories.includes(item.category)) {
      filterCategories.push(item.category);
    }
  });

  const filterHtml = filterCategories
    .map(
      (category, index) => `
      <li class="${index === 0 ? "active" : ""}" onclick="filterItems(this)" data-category="${category}">
        ${ITEM_CATEGORIES[category] || category}
      </li>`
    )
    .join("");
  filterEl.innerHTML = filterHtml;
};

// Kategoriye göre ürünleri filtrele
const filterItems = (filterEl) => {
  const activeFilter = document.querySelector(".filter .active");
  if (activeFilter) activeFilter.classList.remove("active");
  filterEl.classList.add("active");

  const itemCategory = filterEl.dataset.category;
  fetch(`http://localhost:5000/items/filter?category=${itemCategory}`)
    .then((res) => res.json())
    .then((filteredItems) => createItemItemsHtml(filteredItems))
    .catch((error) => console.error("Error fetching filtered items:", error));
};

// Sepet öğelerini listele
const listBasketItems = () => {
  const basketListEl = document.querySelector(".basket__list");
  const basketCountEl = document.querySelector(".basket__count");
  const totalPriceEl = document.querySelector(".total__price");

  if (!basketListEl || !basketCountEl || !totalPriceEl) {
    console.error("Basket list elements not found");
    return;
  }

  basketCountEl.innerHTML = basketList.length > 0 ? basketList.length : "";
  let basketListHtml = "";
  basketList.forEach((item) => {
    if (item.quantity > 0) {
      basketListHtml += `
        <li class="basket__item">
          <img src="${item.imgSource}" width="100" height="100" />
          <div class="basket__item-info">
            <h3 class="item__name">${item.name}</h3>
            <span class="item__price">${item.price}₺</span><br />
            <span class="item__remove" onclick="removeItemFromBasket(${item.item_id})">
              remove
            </span>
          </div>
          <div class="item__count">
            <span class="decrease" onclick="decreaseItemInBasket(${item.item_id})">-</span>
            <span class="my-5">${item.quantity}</span>
            <span class="increase" onclick="increaseItemInBasket(${item.item_id})">+</span>
          </div>
        </li>`;
    }
  });

  basketListEl.innerHTML =
    basketListHtml || `<li class="basket__item">No items to buy again.</li>`;
};

// Sepete ürün ekle
const addItemToBasket = (itemId) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return alert("You need to login first!");
  }

  fetch("http://localhost:5000/basket", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ item_id: itemId, quantity: 1 }),
  })
    .then((response) => response.json())
    .then((data) => {
      toastr.success(data.message);
      getBasketItems();
    })
    .catch((error) => {
      console.error("Error:", error);
      toastr.error("Cannot add to basket");
    });
};

// Sepetten ürün çıkar
const removeItemFromBasket = (id) => {
  fetch(`http://localhost:5000/basket/${id}`, {
    method: "DELETE",
  })
    .then((res) => res.text())
    .then((message) => {
      getBasketItems();
      toastr.success(message);
    })
    .catch((error) =>
      console.error("Error removing item from basket:", error)
    );
};

// Sepetteki ürün miktarını azalt
const decreaseItemInBasket = (id) => {
  const basketItem = basketList.find((item) => item.item_id === id);
  if (basketItem && basketItem.quantity === 1) {
    removeItemFromBasket(id);
  } else {
    fetch(`http://localhost:5000/basket/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: -1 }),
    })
      .then((res) => res.text())
      .then((message) => {
        getBasketItems();
        toastr.success(message);
      })
      .catch((error) =>
        console.error("Error decreasing item quantity in basket:", error)
      );
  }
};

// Sepetteki ürün miktarını artır
const increaseItemInBasket = (id) => {
  fetch(`http://localhost:5000/basket/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity: 1 }),
  })
    .then((res) => res.text())
    .then((message) => {
      getBasketItems();
      toastr.success(message);
    })
    .catch((error) =>
      console.error("Error increasing item quantity in basket:", error)
    );
};

// Sepetin toplam fiyatını getir
const fetchTotalPrice = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("User is not logged in. Skipping total price fetch.");
    return;
  }

  fetch("http://localhost:5000/total-price", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} - ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      const totalPriceElement = document.querySelector(".total__price");
      if (!totalPriceElement) {
        console.error("Total price element not found in try.html!");
        return;
      }
      if (data.total_price && typeof data.total_price === "number") {
        totalPriceElement.innerText = `Total: ${data.total_price.toFixed(2)}₺`;
      } else {
        console.error("total_price is not a valid number:", data.total_price);
        totalPriceElement.innerText = "Total: 0₺";
      }
    })
    .catch((error) => console.error("Error fetching total price:", error));
};

// Arama fonksiyonu
const searchItems = () => {
  const searchQuery = document.getElementById("search-input").value;
  fetch(`http://localhost:5000/search?q=${searchQuery}`)
    .then((res) => res.json())
    .then((items) => createItemItemsHtml(items))
    .catch((error) => console.error("Error searching items:", error));
};

/* -----------------------------------------
   Kullanıcı İşlemleri
----------------------------------------- */
// Kayıt ol
const registerUser = () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("http://localhost:5000/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => response.text())
    .then((message) => {
      alert(message);
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to register");
    });
};

// Giriş yap
const loginUser = () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("http://localhost:5000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        fetchUserProfile();
        alert("Login successful");
        window.location.href = "try.html";
      } else {
        alert("Login failed");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to login");
    });
};

// Kullanıcı adını göster
const displayUsername = () => {
  const username = localStorage.getItem("username");
  const usernameDisplay = document.getElementById("usernameDisplay");
  if (username && usernameDisplay) {
    usernameDisplay.innerText = `Welcome, ${username}`;
  }
};

// Çıkış yap
const logoutUser = () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
};

// Kullanıcı profilini getir
const fetchUserProfile = () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch("http://localhost:5000/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((user) => {
      if (user.username) {
        const usernameDisplay = document.getElementById("usernameDisplay");
        if (usernameDisplay) {
          usernameDisplay.innerText = `👋 Hoşgeldin, ${user.username}!`;
        }
      }
    })
    .catch((error) =>
      console.error("Error fetching user profile:", error)
    );
};

// Siparişleri getir
const getOrders = () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const ordersListElement = document.getElementById("ordersList");
  if (!ordersListElement) return;

  fetch("http://localhost:5000/orders", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.json())
    .then((orders) => {
      let ordersHtml = "";
      orders.forEach((order) => {
        ordersHtml += `<li>Order #${order.order_id} - ${order.total_price}₺ - ${order.order_date}</li>`;
      });
      ordersListElement.innerHTML = ordersHtml;
    })
    .catch((error) => console.error("Error fetching orders:", error));
};

/* -----------------------------------------
   Ödeme ve Checkout İşlemleri
----------------------------------------- */
// Checkout butonunu ayarla
const setupCheckoutButton = () => {
  const checkoutButton = document.querySelector(".btn__purple");
  if (!checkoutButton) return;

  checkoutButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You need to login first!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/total-price", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok)
        throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      if (data && typeof data.total_price === "number" && !isNaN(data.total_price)) {
        if (data.total_price === 0) {
          alert("Sepetiniz boş! Lütfen ürün ekleyin.");
        } else {
          localStorage.setItem("totalPrice", data.total_price.toFixed(2));
          window.location.href = "payment2.html";
        }
      } else {
        alert("Hata oluştu: Geçersiz toplam fiyat.");
      }
    } catch (error) {
      console.error("Error fetching total price:", error);
      alert("Hata oluştu, lütfen tekrar deneyin.");
    }
  });
};

/* -----------------------------------------
   Yönlendirme Yardımcıları
----------------------------------------- */
const redirectToLogin = () => (window.location.href = "login.html");
const redirectToHome = () => (window.location.href = "try.html");

/* -----------------------------------------
   DOMContentLoaded Başlatma
----------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname;

  if (currentPage.endsWith("try.html")) {
    getItems();
    getBasketItems();
  } else if (currentPage.endsWith("payment2.html")) {
    fetchTotalPrice();
  }

  setupCheckoutButton();

  if (document.getElementById("ordersList")) {
    getOrders();
  }

  fetchUserProfile();
  displayUsername();
});

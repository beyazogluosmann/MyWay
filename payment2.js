document.addEventListener("DOMContentLoaded", () => {
    const totalPriceElement = document.getElementById("total-price");

    if (!totalPriceElement) {
        console.error("Total price element not found in payment2.html!");
        return;
    }

    fetch("http://localhost:5000/total-price", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    })
    .then((res) => res.json())
    .then((data) => {
        if (data && typeof data.total_price === "number" && !isNaN(data.total_price)) {
            totalPriceElement.innerText = `Total Price: ${data.total_price.toFixed(2)}₺`;
        } else {
            console.error("Invalid total price:", data.total_price);
            totalPriceElement.innerText = "Total Price: 0₺";
        }
    })
    .catch((error) => console.error("Error fetching total price:", error));
});


function redirectToLogin() {
    window.location.href = "login.html"; 
}
function redirectToHome() {
    window.location.href = "try.html"; 
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function handleResponse(response: Response, defaultErrorMsg: string) {
  const data = await response.json();

  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("gullybaba_admin_token");
    localStorage.removeItem("gullybaba_admin_user");
    localStorage.removeItem("gullybaba_admin_profile");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    throw new Error(data.message || defaultErrorMsg);
  }

  return data;
}

export async function checkBackend() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend API request failed");
  }

  return response.json();
}

export async function loginAdmin(credentials: Record<string, string>) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return handleResponse(response, "Login failed");
}

export async function getWelcomeMessage(token: string) {
  const response = await fetch(`${API_URL}/api/auth/welcome`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch welcome message");
}

export async function fetchUserById(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/users/${id}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch user data");
}

export async function fetchUsers(token: string, page = 1, limit = 20, search = "", role = "") {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    role
  });

  const response = await fetch(`${API_URL}/api/users?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch users");
}

export async function fetchOrders(
  token: string,
  page = 1,
  limit = 20,
  search = "",
  status = "",
  start_date = "",
  end_date = "",
  category = "",
  payment_method = ""
) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    status,
    start_date,
    end_date,
    category,
    payment_method
  });

  const response = await fetch(`${API_URL}/api/orders?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch orders");
}

export async function fetchOrderStatusCounts(token: string) {
  const response = await fetch(`${API_URL}/api/orders/status-counts`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch order status counts");
}

export async function fetchOrderMonths(token: string) {
  const response = await fetch(`${API_URL}/api/orders/months`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch order months");
}

export async function fetchOrderCategories(token: string) {
  const response = await fetch(`${API_URL}/api/orders/categories`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch order categories");
}

export async function fetchOrderById(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch order details");
}

export async function fetchOrderWeight(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/weight`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to compute order weight");
}

export async function previewTekipost(token: string, id: number | string, totalWeight: number) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/tekipost-preview`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ total_weight: totalWeight }),
  });

  return handleResponse(response, "Failed to build TekiPost preview");
}

export async function previewShiprocket(token: string, id: number | string, totalWeight: number) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/shiprocket-preview`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ total_weight: totalWeight }),
  });

  return handleResponse(response, "Failed to build Shiprocket preview");
}

export async function fetchTekipostStatus(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/tekipost-status`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch TekiPost status");
}

export async function fetchShiprocketStatus(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/shiprocket-status`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch Shiprocket status");
}

export async function fetchOrderNotes(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/notes`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch order notes");
}

export async function addOrderNote(token: string, id: number | string, content: string, noteType: string) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/notes`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, note_type: noteType }),
  });

  return handleResponse(response, "Failed to add order note");
}

export async function deleteOrderNote(token: string, id: number | string, noteId: number) {
  const response = await fetch(`${API_URL}/api/orders/local/${id}/notes/${noteId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to delete order note");
}

export async function updateOrderStatus(token: string, orderId: number, status: string) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return handleResponse(response, "Failed to update order status");
}

export async function updateOrderAddress(
  token: string,
  orderId: number,
  address: { billing?: object; shipping?: object }
) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/address`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(address),
  });

  return handleResponse(response, "Failed to update order address");
}

export async function fetchProducts(
  token: string,
  page = 1,
  limit = 20,
  search = "",
  category = "",
  status = ""
) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    category,
    status
  });

  const response = await fetch(`${API_URL}/api/products?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch products");
}

export async function fetchCoupons(
  token: string,
  page = 1,
  limit = 20,
  search = "",
  status = ""
) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    status
  });

  const response = await fetch(`${API_URL}/api/coupons?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch coupons");
}

export async function fetchPosts(
  token: string,
  page = 1,
  limit = 20,
  search = "",
  status = ""
) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    status
  });

  const response = await fetch(`${API_URL}/api/blog?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch blog posts");
}

export async function fetchAbandonedCarts(
  token: string,
  page = 1,
  limit = 20,
  search = "",
  product = ""
) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    product
  });

  const response = await fetch(`${API_URL}/api/abandoned-carts?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response, "Failed to fetch abandoned carts");
}


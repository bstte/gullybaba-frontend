const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

export async function getWelcomeMessage(token: string) {
  const response = await fetch(`${API_URL}/api/auth/welcome`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch welcome message");
  }

  return data;
}

export async function fetchUserById(token: string, id: number | string) {
  const response = await fetch(`${API_URL}/api/users/${id}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch user data");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch users");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch orders");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update order status");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch products");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch coupons");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch blog posts");
  }

  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch abandoned carts");
  }

  return data;
}


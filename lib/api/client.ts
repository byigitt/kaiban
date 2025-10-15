export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch (error) {
    if (response.ok) {
      throw new Error("The server returned an empty response.");
    }
  }

  if (!response.ok) {
    const message =
      data &&
        typeof data === "object" &&
        "error" in data &&
        (data as { error?: unknown }).error
        ? String((data as { error?: unknown }).error)
        : "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

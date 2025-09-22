import { getApiScheduler, login } from "./api/login-api.js";

/* Helpers */
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
}
function setLoading(formEl, loading) {
  const btn = formEl.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText ??= btn.textContent;
  btn.textContent = loading ? "Mengirim..." : btn.dataset.originalText;
}
function swalError(title, text) {
  return window.Swal
    ? window.Swal.fire(title || "Oops!", text || "Terjadi kesalahan.", "error")
    : alert(`${title}\n${text}`);
}
function swalSuccess(opts = {}) {
  if (window.Swal) {
    return window.Swal.fire({
      icon: "success",
      title: opts.title || "Berhasil!",
      text: opts.text || "Link verifikasi sudah dikirim ke email kamu.",
      confirmButtonColor: "#1f5ccc",
    });
  }
  alert("Berhasil: Link verifikasi sudah dikirim ke email kamu.");
}

/* Main */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  if (!form || !emailInput) return;

  const hasJQ = !!(window.jQuery && window.jQuery.fn);
  const hasValidate = hasJQ && typeof window.jQuery.fn.validate === "function";

  // ===== jQuery Validate mode =====
  if (hasValidate) {
    const $ = window.jQuery;
    const $form = $(form);

    $form.validate({
      focusInvalid: false,
      errorElement: "div",
      errorClass: "auth__error",

      rules: { email: { required: true, email: true } },
      messages: {
        email: {
          required: "Email wajib diisi",
          email: "Format email tidak valid",
        },
      },

      // Tampilkan error di bawah input (dalam .auth__group)
      errorPlacement: function (error, element) {
        const group = element.closest(".auth__group");
        if (group) error.appendTo(group);
        else error.insertAfter(element);
      },

      highlight: function (element) {
        element.classList.add("error");
      },
      unhighlight: function (element) {
        element.classList.remove("error");
      },

      // Submit ketika valid
      submitHandler: async function () {
        const email = emailInput.value.trim();
        setLoading(form, true);
        try {
          // validasi tambahan (jaga-jaga)
          if (!isEmail(email)) {
            throw new Error("Format email tidak valid");
          }
          const res = await login(email);
          await getApiScheduler();
          if (!res.status) {
            return swalError("Gagal", res.message || "Login gagal, coba lagi.");
          } else {
            await swalSuccess({
              title: "Berhasil!",
              text: "Link verifikasi sudah dikirim ke email kamu.",
            });
          }
          emailInput.value = "";
          // window.location.href = "/"; // kalau mau redirect
        } catch (err) {
          const msg = err?.message || err?.detail || "Login gagal, coba lagi.";
          await swalError("Gagal", msg);
        } finally {
          setLoading(form, false);
        }
      },
    });

    // biar jQuery Validate yang handle submit
    form.addEventListener("submit", (e) => e.preventDefault());
    return;
  }

  // ===== Fallback: Native + SweetAlert2 =====
  form.setAttribute("novalidate", "novalidate");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
      await swalError("Oops!", "Email wajib diisi");
      emailInput.focus();
      return;
    }
    if (!isEmail(email)) {
      await swalError("Oops!", "Format email tidak valid");
      emailInput.focus();
      return;
    }

    setLoading(form, true);
    try {
      const res = await login(email);
      await getApiScheduler();
      if (!res.status) {
        return swalError("Gagal", res.message || "Login gagal, coba lagi.");
      } else {
        await swalSuccess({
          title: "Berhasil!",
          text: "Link verifikasi sudah dikirim ke email kamu.",
        });
      }
      emailInput.value = "";
    } catch (err) {
      const msg = err?.message || err?.detail || "Login gagal, coba lagi.";
      await swalError("Gagal", msg);
    } finally {
      setLoading(form, false);
    }
  });
});

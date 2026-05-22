/**
 * community.js — Labhansh.ai Farmer Community
 *
 * Fixes applied vs original:
 * 1. openCreatePostModal / closeCreatePostModal now use `fixed` modal correctly
 *    (body scroll lock added/removed properly).
 * 2. loadCommunityStats() guards against missing DOM elements so it no longer
 *    throws a TypeError that halted ALL subsequent JS execution.
 * 3. getTranslation() now reads from window.__i18n (set by base.html) with
 *    sensible English fallbacks — window.t is not a function.
 * 4. currentUser initialisation reads window.userData which base.html sets
 *    before this script loads.
 * 5. Escape-key listener and backdrop-click handler only defined here (not
 *    duplicated in an inline <script> block in community.html).
 */

"use strict";

let currentUser = null;
let posts = [];

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  // window.userData is set by base.html BEFORE this script loads.
  currentUser = window.userData || null;
  initializeCommunity();
});

function initializeCommunity() {
  loadPosts();
  loadCommunityStats(); // safe — now guards for missing elements
  setupEventListeners();
  autoFillLocation();
}

function setupEventListeners() {
  // Post form submission
  const postForm = document.getElementById("postForm");
  if (postForm) {
    postForm.addEventListener("submit", handleCreatePost);
  }

  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  // Escape key closes modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCreatePostModal();
  });
}

// ─────────────────────────────────────────────
// Modal helpers
// ─────────────────────────────────────────────

/**
 * Opens the Create Post modal.
 * The modal uses `position: fixed` (set in community.html) so it always
 * appears centred in the visible viewport regardless of scroll position.
 * We also lock the page scroll while the modal is open.
 */
function openCreatePostModal() {
  const modal = document.getElementById("createPostModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

/**
 * Closes the Create Post modal and restores page scroll.
 */
function closeCreatePostModal() {
  const modal = document.getElementById("createPostModal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  clearPostForm();
}

/**
 * Clicking the dark backdrop (not the card) closes the modal.
 * The card itself has onclick="event.stopPropagation()" so clicks
 * inside the card do not bubble up to this handler.
 */
function handleModalBackdropClick(event) {
  if (event.target && event.target.id === "createPostModal") {
    closeCreatePostModal();
  }
}

function clearPostForm() {
  const postForm = document.getElementById("postForm");
  if (postForm) postForm.reset();
}

// ─────────────────────────────────────────────
// Location auto-fill
// ─────────────────────────────────────────────
function autoFillLocation() {
  const locationInput = document.getElementById("locationInput");
  if (!locationInput) return;

  const savedLocation = localStorage.getItem("userLocation");
  if (savedLocation) {
    locationInput.value = savedLocation;
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (position) {
        try {
          const { latitude, longitude } = position.coords;
          const location = await getLocationFromCoords(latitude, longitude);
          if (location) {
            locationInput.value = location;
            localStorage.setItem("userLocation", location);
          }
        } catch (err) {
          console.log("Could not get location from coordinates:", err);
        }
      },
      function (err) {
        console.log("Geolocation error:", err);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }
}

async function getLocationFromCoords(lat, lon) {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    const data = await response.json();
    return data.city || data.locality || data.countryName || null;
  } catch (err) {
    console.error("Reverse geocoding error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// Create Post
// ─────────────────────────────────────────────
async function handleCreatePost(e) {
  e.preventDefault();

  if (!currentUser || !currentUser.id) {
    showToast(getTranslation("error_login"), "error");
    return;
  }

  const formData = new FormData(e.target);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalHTML = submitBtn ? submitBtn.innerHTML : "";

  if (submitBtn) {
    submitBtn.innerHTML =
      '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
    submitBtn.disabled = true;
  }

  try {
    const response = await fetch("/community/api/create-post", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      showToast(getTranslation("success_post"), "success");
      e.target.reset();
      closeCreatePostModal();
      await loadPosts();
    } else {
      showToast(data.error || getTranslation("error_generic"), "error");
    }
  } catch (err) {
    console.error("Error creating post:", err);
    showToast(getTranslation("error_generic"), "error");
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
    }
  }
}

// ─────────────────────────────────────────────
// Load & render posts
// ─────────────────────────────────────────────
async function loadPosts() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const noPostsMessage = document.getElementById("noPostsMessage");
  const postsFeed = document.getElementById("postsFeed");

  if (loadingIndicator) loadingIndicator.classList.remove("hidden");
  if (noPostsMessage) noPostsMessage.classList.add("hidden");

  try {
    const response = await fetch("/community/api/posts");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.posts && data.posts.length > 0) {
      posts = data.posts;
      renderPosts(posts);
    } else {
      if (postsFeed) postsFeed.innerHTML = "";
      if (noPostsMessage) noPostsMessage.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Error loading posts:", err);
    showToast(getTranslation("error_generic"), "error");
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add("hidden");
  }
}

/**
 * loadCommunityStats — now guards against missing elements.
 * Previously this threw "Cannot set textContent of null" which halted
 * all further JS execution on the page.
 */
async function loadCommunityStats() {
  try {
    const response = await fetch("/community/api/stats");
    if (!response.ok) return; // stats endpoint optional — fail silently

    const data = await response.json();

    if (data.success) {
      const setEl = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setEl("totalPosts", data.stats.total_posts || 0);
      setEl("activeFarmers", data.stats.active_farmers || 0);
      setEl("todayPosts", data.stats.today_posts || 0);
    }
  } catch (err) {
    // Stats are non-critical — swallow error so it doesn't break the page.
    console.error("Error loading community stats:", err);
  }
}

function renderPosts(postsToRender) {
  const postsFeed = document.getElementById("postsFeed");
  const template = document.getElementById("postCardTemplate");

  if (!postsFeed || !template) return;

  postsFeed.innerHTML = "";

  postsToRender.forEach(function (post) {
    const postCard = template.content.cloneNode(true);
    const postElement = postCard.querySelector("div");

    if (!postElement) return;

    postElement.dataset.postId = post.id;

    // User info
    const userInitials = postElement.querySelector(".user-initials");
    const userName = postElement.querySelector(".user-name");
    const userLocation = postElement.querySelector(".user-location");

    if (userInitials)
      userInitials.textContent = (post.user_name || "?")
        .charAt(0)
        .toUpperCase();
    if (userName) userName.textContent = post.user_name || "";
    if (userLocation) userLocation.textContent = post.user_location || "";

    // Date
    const postDate = postElement.querySelector(".post-date");
    if (postDate) postDate.textContent = formatDate(post.created_at);

    // Image
    if (post.image_url) {
      const imageContainer = postElement.querySelector(".post-image-container");
      const image = postElement.querySelector(".post-image");
      if (image) image.src = post.image_url;
      if (imageContainer) imageContainer.classList.remove("hidden");
    }

    // Content
    const titleEl = postElement.querySelector(".post-title");
    const descEl = postElement.querySelector(".post-description");
    if (titleEl) titleEl.textContent = post.title || "";
    if (descEl) descEl.textContent = post.description || "";

    // Crop type badge
    if (post.crop_type) {
      const cropType = postElement.querySelector(".crop-type");
      if (cropType) {
        const cropValue = cropType.querySelector(".crop-value");
        if (cropValue) cropValue.textContent = post.crop_type;
        cropType.classList.remove("hidden");
        cropType.classList.add("inline-flex");
      }
    }

    // Location badge
    if (post.location) {
      const locationInfo = postElement.querySelector(".location-info");
      if (locationInfo) {
        const locationValue = locationInfo.querySelector(".location-value");
        if (locationValue) locationValue.textContent = post.location;
        locationInfo.classList.remove("hidden");
        locationInfo.classList.add("inline-flex");
      }
    }

    // Counts
    const likesCount = postElement.querySelector(".likes-count");
    const commentsCount = postElement.querySelector(".comments-count");
    if (likesCount) likesCount.textContent = post.likes_count || 0;
    if (commentsCount)
      commentsCount.textContent = post.comments ? post.comments.length : 0;

    // Like button state
    const likeBtn = postElement.querySelector(".like-btn");
    if (likeBtn) {
      if (post.liked) {
        likeBtn.classList.add("text-red-500");
        likeBtn.classList.remove("text-textMid");
        const likeText = likeBtn.querySelector(".like-text");
        if (likeText) likeText.textContent = getTranslation("liked");
      }
      likeBtn.addEventListener("click", function () {
        handleLike(post.id, likeBtn);
      });
    }

    // Comment toggle
    const commentBtn = postElement.querySelector(".comment-btn");
    if (commentBtn) {
      commentBtn.addEventListener("click", function () {
        toggleComments(postElement);
      });
    }

    // Add comment button
    const addCommentBtn = postElement.querySelector(".add-comment-btn");
    const commentInput = postElement.querySelector(".comment-input");
    if (addCommentBtn && commentInput) {
      addCommentBtn.addEventListener("click", function () {
        handleAddComment(post.id, commentInput, postElement);
      });

      // Also allow pressing Enter in the comment input
      commentInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddComment(post.id, commentInput, postElement);
        }
      });
    }

    // Render existing comments
    if (post.comments && post.comments.length > 0) {
      renderComments(postElement, post.comments);
    }

    postsFeed.appendChild(postElement);
  });
}

function renderComments(postElement, comments) {
  const commentsList = postElement.querySelector(".comments-list");
  const commentTemplate = document.getElementById("commentTemplate");

  if (!commentsList || !commentTemplate) return;

  commentsList.innerHTML = "";

  comments.forEach(function (comment) {
    const commentElement = commentTemplate.content.cloneNode(true);

    const initial = commentElement.querySelector(".comment-user-initial");
    const name = commentElement.querySelector(".comment-user-name");
    const text = commentElement.querySelector(".comment-text");
    const date = commentElement.querySelector(".comment-date");

    if (initial)
      initial.textContent = (comment.user_name || "?").charAt(0).toUpperCase();
    if (name) name.textContent = comment.user_name || "";
    if (text) text.textContent = comment.comment || "";
    if (date) date.textContent = formatDate(comment.created_at);

    commentsList.appendChild(commentElement);
  });
}

// ─────────────────────────────────────────────
// Like
// ─────────────────────────────────────────────
async function handleLike(postId, likeBtn) {
  if (!currentUser || !currentUser.id) {
    showToast(getTranslation("error_login"), "error");
    return;
  }

  try {
    const response = await fetch("/community/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      const likesCount = likeBtn.querySelector(".likes-count");
      const likeText = likeBtn.querySelector(".like-text");

      if (likesCount) likesCount.textContent = data.likes_count;

      if (data.liked) {
        likeBtn.classList.add("text-red-500");
        likeBtn.classList.remove("text-textMid");
        if (likeText) likeText.textContent = getTranslation("liked");
      } else {
        likeBtn.classList.remove("text-red-500");
        likeBtn.classList.add("text-textMid");
        if (likeText) likeText.textContent = getTranslation("likes");
      }
    } else {
      showToast(data.error || getTranslation("error_generic"), "error");
    }
  } catch (err) {
    console.error("Error liking post:", err);
    showToast(getTranslation("error_generic"), "error");
  }
}

// ─────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────
function toggleComments(postElement) {
  const commentsSection = postElement.querySelector(".comments-section");
  if (commentsSection) commentsSection.classList.toggle("hidden");
}

async function handleAddComment(postId, commentInput, postElement) {
  if (!currentUser || !currentUser.id) {
    showToast(getTranslation("error_login"), "error");
    return;
  }

  const comment = commentInput.value.trim();
  if (!comment) return;

  const addBtn = postElement.querySelector(".add-comment-btn");
  const originalText = addBtn ? addBtn.textContent : "Comment";

  if (addBtn) {
    addBtn.textContent = getTranslation("loading");
    addBtn.disabled = true;
  }

  try {
    const response = await fetch("/community/api/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, comment: comment }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      commentInput.value = "";
      // Reload posts to get updated comment list
      await loadPosts();
      showToast(getTranslation("success_comment"), "success");
    } else {
      showToast(data.error || getTranslation("error_generic"), "error");
    }
  } catch (err) {
    console.error("Error adding comment:", err);
    showToast(getTranslation("error_generic"), "error");
  } finally {
    if (addBtn) {
      addBtn.textContent = originalText;
      addBtn.disabled = false;
    }
  }
}

// ─────────────────────────────────────────────
// Search / Filter
// ─────────────────────────────────────────────
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    renderPosts(posts);
    return;
  }

  const filteredPosts = posts.filter(function (post) {
    return (
      (post.title && post.title.toLowerCase().includes(searchTerm)) ||
      (post.description &&
        post.description.toLowerCase().includes(searchTerm)) ||
      (post.user_name && post.user_name.toLowerCase().includes(searchTerm)) ||
      (post.crop_type && post.crop_type.toLowerCase().includes(searchTerm)) ||
      (post.location && post.location.toLowerCase().includes(searchTerm))
    );
  });

  renderPosts(filteredPosts);
}

function filterPosts(filterType) {
  let filteredPosts = posts.slice();

  switch (filterType) {
    case "recent":
      filteredPosts.sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      break;
    case "popular":
      filteredPosts.sort(function (a, b) {
        return (b.likes_count || 0) - (a.likes_count || 0);
      });
      break;
    default:
      break;
  }

  renderPosts(filteredPosts);
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return Math.floor(diffHours) + "h ago";
  if (diffDays < 7) return Math.floor(diffDays) + "d ago";
  return date.toLocaleDateString();
}

/**
 * getTranslation — reads from window.__i18n which base.html populates.
 *
 * The original code used `window.t ? window.t(key) : key` but window.t
 * is a Jinja variable (dict), not a JS function — it is never available
 * in JS scope. The correct source is window.__i18n set by base.html.
 */
function getTranslation(key) {
  if (window.__i18n && window.__i18n[key]) return window.__i18n[key];

  // English fallbacks so the UI is never broken even if i18n fails to load.
  const fallbacks = {
    error_login: "Please log in to continue.",
    error_generic: "Something went wrong. Please try again.",
    success_post: "Post created successfully!",
    success_comment: "Comment added!",
    liked: "Liked",
    likes: "likes",
    loading: "Loading...",
    add_comment: "Comment",
  };
  return fallbacks[key] !== undefined ? fallbacks[key] : key;
}

// ─────────────────────────────────────────────
// Toast notifications
// ─────────────────────────────────────────────
function showToast(message, type) {
  type = type || "info";

  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "fixed top-4 right-4 z-[100] space-y-2";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  const colorMap = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-500 text-white",
  };

  toast.className =
    "max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full " +
    (colorMap[type] || colorMap.info);

  toast.innerHTML =
    '<div class="flex items-center">' +
    '<span class="flex-1">' +
    message +
    "</span>" +
    '<button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">&times;</button>' +
    "</div>";

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(function () {
    toast.classList.remove("translate-x-full");
  }, 50);

  // Auto-dismiss after 5 s
  setTimeout(function () {
    if (toast.parentElement) {
      toast.classList.add("translate-x-full");
      setTimeout(function () {
        if (toast.parentElement) toast.remove();
      }, 300);
    }
  }, 5000);
}

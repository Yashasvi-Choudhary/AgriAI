// Community JavaScript - Modern Version
let currentUser = null;
let posts = [];

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get user data from the global window.userData set by base.html
  currentUser = window.userData || null;
  initializeCommunity();
});

function initializeCommunity() {
  loadPosts();
  loadCommunityStats();
  setupEventListeners();
  autoFillLocation();
}

function setupEventListeners() {
  // Post form submission
  const postForm = document.getElementById("postForm");
  if (postForm) {
    postForm.addEventListener("submit", handleCreatePost);
  }

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }
}

// Modal functions
function openCreatePostModal() {
  const modal = document.getElementById("createPostModal");
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCreatePostModal() {
  const modal = document.getElementById("createPostModal");
  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
  clearPostForm();
}

function clearPostForm() {
  const postForm = document.getElementById("postForm");
  if (postForm) {
    postForm.reset();
  }
}

// Auto-fill location from localStorage or geolocation
function autoFillLocation() {
  const locationInput = document.getElementById("locationInput");
  if (!locationInput) return;

  // Try to get location from localStorage first
  const savedLocation = localStorage.getItem("userLocation");
  if (savedLocation) {
    locationInput.value = savedLocation;
    return;
  }

  // Try to get current location using geolocation API
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const location = await getLocationFromCoords(latitude, longitude);
          if (location) {
            locationInput.value = location;
            localStorage.setItem("userLocation", location);
          }
        } catch (error) {
          console.log("Could not get location from coordinates:", error);
        }
      },
      (error) => {
        console.log("Geolocation error:", error);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }
}

// Get location name from coordinates using reverse geocoding
async function getLocationFromCoords(lat, lon) {
  try {
    // Using a free geocoding service (you might want to use a paid service for production)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    const data = await response.json();
    return data.city || data.locality || `${data.countryName}`;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

async function handleCreatePost(e) {
  e.preventDefault();

  if (!currentUser) {
    showToast(getTranslation("error_login"), "error");
    return;
  }

  const formData = new FormData(e.target);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Show loading state
  submitBtn.innerHTML =
    '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';
  submitBtn.disabled = true;

  try {
    const response = await fetch("/community/api/create-post", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showToast(getTranslation("success_post"), "success");
      e.target.reset();
      closeCreatePostModal();
      loadPosts(); // Refresh feed
      loadCommunityStats(); // Update stats
    } else {
      showToast(data.error || getTranslation("error_generic"), "error");
    }
  } catch (error) {
    console.error("Error creating post:", error);
    showToast(getTranslation("error_generic"), "error");
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

async function loadPosts() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const noPostsMessage = document.getElementById("noPostsMessage");
  const postsFeed = document.getElementById("postsFeed");

  loadingIndicator.classList.remove("hidden");
  noPostsMessage.classList.add("hidden");

  try {
    const response = await fetch("/community/api/posts");
    const data = await response.json();

    if (data.posts && data.posts.length > 0) {
      posts = data.posts;
      renderPosts(posts);
    } else {
      postsFeed.innerHTML = "";
      noPostsMessage.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error loading posts:", error);
    showToast(getTranslation("error_generic"), "error");
  } finally {
    loadingIndicator.classList.add("hidden");
  }
}

async function loadCommunityStats() {
  try {
    const response = await fetch("/community/api/stats");
    const data = await response.json();

    if (data.success) {
      document.getElementById("totalPosts").textContent =
        data.stats.total_posts || 0;
      document.getElementById("activeFarmers").textContent =
        data.stats.active_farmers || 0;
      document.getElementById("todayPosts").textContent =
        data.stats.today_posts || 0;
    }
  } catch (error) {
    console.error("Error loading community stats:", error);
  }
}

function renderPosts(postsToRender) {
  const postsFeed = document.getElementById("postsFeed");
  const template = document.getElementById("postCardTemplate");

  postsFeed.innerHTML = "";

  postsToRender.forEach((post) => {
    const postCard = template.content.cloneNode(true);
    const postElement = postCard.querySelector("div");

    // Set post ID
    postElement.dataset.postId = post.id;

    // User info
    const userInitials = postElement.querySelector(".user-initials");
    const userName = postElement.querySelector(".user-name");
    const userLocation = postElement.querySelector(".user-location");

    userInitials.textContent = post.user_name.charAt(0).toUpperCase();
    userName.textContent = post.user_name;
    userLocation.textContent = post.user_location || "";

    // Post date
    const postDate = postElement.querySelector(".post-date");
    postDate.textContent = formatDate(post.created_at);

    // Post image
    if (post.image_url) {
      const imageContainer = postElement.querySelector(".post-image-container");
      const image = postElement.querySelector(".post-image");
      image.src = post.image_url;
      imageContainer.classList.remove("hidden");
    }

    // Post content
    postElement.querySelector(".post-title").textContent = post.title;
    postElement.querySelector(".post-description").textContent =
      post.description;

    // Crop type and location
    if (post.crop_type) {
      const cropType = postElement.querySelector(".crop-type");
      cropType.querySelector(".crop-value").textContent = post.crop_type;
      cropType.classList.remove("hidden");
    }

    if (post.location) {
      const locationInfo = postElement.querySelector(".location-info");
      locationInfo.querySelector(".location-value").textContent = post.location;
      locationInfo.classList.remove("hidden");
    }

    // Likes and comments count
    postElement.querySelector(".likes-count").textContent = post.likes_count;
    postElement.querySelector(".comments-count").textContent =
      post.comments.length;

    // Event listeners
    const likeBtn = postElement.querySelector(".like-btn");
    const commentBtn = postElement.querySelector(".comment-btn");
    const addCommentBtn = postElement.querySelector(".add-comment-btn");
    const commentInput = postElement.querySelector(".comment-input");

    likeBtn.addEventListener("click", () => handleLike(post.id, likeBtn));
    commentBtn.addEventListener("click", () => toggleComments(postElement));
    addCommentBtn.addEventListener("click", () =>
      handleAddComment(post.id, commentInput, postElement),
    );

    // Render comments
    renderComments(postElement, post.comments);

    postsFeed.appendChild(postElement);
  });
}

function renderComments(postElement, comments) {
  const commentsList = postElement.querySelector(".comments-list");
  const commentTemplate = document.getElementById("commentTemplate");

  commentsList.innerHTML = "";

  comments.forEach((comment) => {
    const commentElement = commentTemplate.content.cloneNode(true);

    commentElement.querySelector(".comment-user-initial").textContent =
      comment.user_name.charAt(0).toUpperCase();
    commentElement.querySelector(".comment-user-name").textContent =
      comment.user_name;
    commentElement.querySelector(".comment-text").textContent = comment.comment;
    commentElement.querySelector(".comment-date").textContent = formatDate(
      comment.created_at,
    );

    commentsList.appendChild(commentElement);
  });
}

async function handleLike(postId, likeBtn) {
  if (!currentUser || !currentUser.id) {
    showToast(getTranslation("error_login"), "error");
    return;
  }

  try {
    const response = await fetch("/community/api/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ post_id: postId }),
    });

    const data = await response.json();

    if (data.success) {
      const likesCount = likeBtn.querySelector(".likes-count");
      const likeIcon = likeBtn.querySelector(".like-icon");
      const likeText = likeBtn.querySelector(".like-text");

      likesCount.textContent = data.likes_count;

      if (data.liked) {
        likeBtn.classList.add("text-red-500");
        likeBtn.classList.remove("text-textMid");
        likeText.textContent = getTranslation("liked") || "Liked";
      } else {
        likeBtn.classList.remove("text-red-500");
        likeBtn.classList.add("text-textMid");
        likeText.textContent = getTranslation("likes") || "likes";
      }
    } else {
      showToast(data.error || getTranslation("error_generic"), "error");
    }
  } catch (error) {
    console.error("Error liking post:", error);
    showToast(getTranslation("error_generic"), "error");
  }
}

function toggleComments(postElement) {
  const commentsSection = postElement.querySelector(".comments-section");
  commentsSection.classList.toggle("hidden");
}

async function handleAddComment(postId, commentInput, postElement) {
  if (!currentUser || !currentUser.id) {
    showToast(getTranslation("error_login"), "error");
    return;
  }

  const comment = commentInput.value.trim();
  if (!comment) return;

  const addBtn = postElement.querySelector(".add-comment-btn");
  const originalText = addBtn.textContent;

  addBtn.textContent = getTranslation("loading") || "Loading...";
  addBtn.disabled = true;

  try {
    const response = await fetch("/community/api/comment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_id: postId,
        comment: comment,
      }),
    });

    const data = await response.json();

    if (data.success) {
      commentInput.value = "";
      // Reload posts to get updated comments
      loadPosts();
      showToast(getTranslation("success_comment"), "success");
    } else {
      showToast(data.error || getTranslation("error_generic"), "error");
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    showToast(getTranslation("error_generic"), "error");
  } finally {
    addBtn.textContent = originalText;
    addBtn.disabled = false;
  }
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();

  if (!searchTerm) {
    renderPosts(posts);
    return;
  }

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm) ||
      post.description.toLowerCase().includes(searchTerm) ||
      post.user_name.toLowerCase().includes(searchTerm) ||
      (post.crop_type && post.crop_type.toLowerCase().includes(searchTerm)) ||
      (post.location && post.location.toLowerCase().includes(searchTerm)),
  );

  renderPosts(filteredPosts);
}

function filterPosts(filterType) {
  let filteredPosts = [...posts];

  switch (filterType) {
    case "recent":
      filteredPosts.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      break;
    case "popular":
      filteredPosts.sort((a, b) => b.likes_count - a.likes_count);
      break;
    case "all":
    default:
      // Already sorted by default
      break;
  }

  renderPosts(filteredPosts);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    return "Just now";
  } else if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  } else if (diffDays < 7) {
    return `${Math.floor(diffDays)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function getTranslation(key) {
  return window.t ? window.t(key) : key;
}

// Toast notification system (replaces alerts)
function showToast(message, type = "info") {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "fixed top-4 right-4 z-50 space-y-2";
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;

  // Set colors based on type
  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-500 text-white",
  };

  toast.classList.add(...colors[type].split(" "));
  toast.innerHTML = `
    <div class="flex items-center">
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">&times;</button>
    </div>
  `;

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove("translate-x-full");
  }, 100);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("translate-x-full");
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

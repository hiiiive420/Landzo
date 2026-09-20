import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  listPublishedBlogs,
} from "../../api/blogs.api";

import {
  getPublicApiErrorMessage,
} from "../../api/publicApiClient";


const BLOG_PAGE_LIMIT = 9;

const SAVED_BLOGS_KEY =
  "landzo_saved_blogs";


/* =========================================================
   FORMATTERS
   ========================================================= */

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-LK",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
};


const formatReadingTime = (
  value,
) => {
  if (
    !Number.isFinite(value) ||
    value < 1
  ) {
    return "";
  }

  return `${value} min read`;
};


const formatViewCount = (
  value,
) => {
  const count = Number(value);

  if (
    !Number.isFinite(count) ||
    count < 0
  ) {
    return "";
  }

  if (count >= 1000000) {
    const valueInMillions =
      count / 1000000;

    return `${valueInMillions.toFixed(
      count >= 10000000
        ? 0
        : 1,
    )}M`;
  }

  if (count >= 1000) {
    const valueInThousands =
      count / 1000;

    return `${valueInThousands.toFixed(
      count >= 10000
        ? 0
        : 1,
    )}K`;
  }

  return String(count);
};


const getBlogViewCount = (
  blog,
) => {
  const value =
    blog?.viewCount ??
    blog?.views ??
    blog?.analytics?.views ??
    blog?.analytics?.viewCount ??
    null;

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};


/* =========================================================
   API PARAMS
   ========================================================= */

const buildParams = ({
  category,
  page,
  search,
}) => {
  const params = {
    limit: BLOG_PAGE_LIMIT,
    page,
    sort: "publishDate",
  };

  if (search) {
    params.search = search;
  }

  if (category) {
    params.category = category;
  }

  return params;
};


/* =========================================================
   SAVED BLOG STORAGE
   ========================================================= */

const getSavedBlogIds = () => {
  try {
    const value =
      localStorage.getItem(
        SAVED_BLOGS_KEY,
      );

    if (!value) {
      return [];
    }

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
};


const saveBlogIds = (ids) => {
  try {
    localStorage.setItem(
      SAVED_BLOGS_KEY,
      JSON.stringify(ids),
    );

    return true;
  } catch {
    return false;
  }
};


/* =========================================================
   ICONS
   ========================================================= */

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-properties-search-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <circle
      cx="10.8"
      cy="10.8"
      fill="none"
      r="6.2"
      stroke="currentColor"
      strokeWidth="1.65"
    />

    <path
      d="m15.4 15.4 4.2 4.2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.65"
    />
  </svg>
);


const TuneIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-properties-tune-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M4 7h8
        M16 7h4

        M4 12h3
        M11 12h9

        M4 17h10
        M18 17h2
      "
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
    />

    <circle
      cx="14"
      cy="7"
      fill="none"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <circle
      cx="9"
      cy="12"
      fill="none"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <circle
      cx="16"
      cy="17"
      fill="none"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);


const EyeIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M2.8 12
        s3.4-5.5 9.2-5.5
        9.2 5.5 9.2 5.5
        -3.4 5.5-9.2 5.5
        S2.8 12 2.8 12Z
      "
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />

    <circle
      cx="12"
      cy="12"
      fill="none"
      r="2.4"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);


const BookmarkIcon = ({
  saved = false,
}) => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M7 4.5
        h10
        v15
        l-5-3.3
        -5 3.3
        v-15Z
      "
      fill={
        saved
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);


/* =========================================================
   BLOG IMAGE
   ========================================================= */

const BlogImage = ({
  alt,
  image,
  featured = false,
}) => (
  <div className="landzo-public-blog-image">

    {image?.url ? (
      <img
        alt={
          image.alt ||
          alt
        }
        loading="lazy"
        src={image.url}
      />
    ) : (
      <div
        aria-hidden="true"
        className="landzo-public-blog-image-fallback"
      />
    )}


    {featured ? (
      <span className="landzo-public-blog-featured-badge">
        Featured
      </span>
    ) : null}

  </div>
);


/* =========================================================
   META

   Featured:
   date + read time

   Latest:
   date + read time + views
   ========================================================= */

const BlogMeta = ({
  blog,
  showViews = false,
}) => {
  const date =
    formatDate(
      blog.publishDate,
    );

  const readingTime =
    formatReadingTime(
      blog.readingTime,
    );

  const rawViews =
    Number(blog?.views);

  const hasViews =
    showViews &&
    Number.isFinite(rawViews);


  if (
    !date &&
    !readingTime &&
    !hasViews
  ) {
    return null;
  }


  return (
    <div className="landzo-public-blog-meta">

      {date ? (
        <span>
          {date}
        </span>
      ) : null}


      {readingTime ? (
        <span>
          {readingTime}
        </span>
      ) : null}


      {hasViews ? (
        <span className="landzo-public-blog-views">

          <EyeIcon />

          <span className="landzo-public-blog-view-number">
            {rawViews}
          </span>

        </span>
      ) : null}

    </div>
  );
};

/* =========================================================
   SAVE ARTICLE BUTTON
   ========================================================= */

const BlogSaveButton = ({
  blog,
}) => {
  const blogId =
    String(
      blog.id ||
      blog.slug ||
      "",
    );


  const [
    saved,
    setSaved,
  ] = useState(() =>
    blogId
      ? getSavedBlogIds()
          .includes(blogId)
      : false,
  );


  useEffect(() => {
    if (!blogId) {
      setSaved(false);
      return;
    }

    setSaved(
      getSavedBlogIds()
        .includes(
          blogId,
        ),
    );
  }, [
    blogId,
  ]);


  const handleSave = (
    event,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!blogId) {
      return;
    }


    const current =
      getSavedBlogIds();


    const currentlySaved =
      current.includes(
        blogId,
      );


    const next =
      currentlySaved
        ? current.filter(
            (id) =>
              id !== blogId,
          )
        : [
            ...current,
            blogId,
          ];


    const stored =
      saveBlogIds(next);

    if (!stored) {
      return;
    }


    setSaved(
      !currentlySaved,
    );
  };


  return (
    <button
      aria-label={
        saved
          ? `Remove ${blog.title} from saved articles`
          : `Save ${blog.title}`
      }
      aria-pressed={
        saved
      }
      className={[
        "landzo-public-blog-save-button",

        saved
          ? "is-saved"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={
        handleSave
      }
      type="button"
    >
      <BookmarkIcon
        saved={saved}
      />
    </button>
  );
};


/* =========================================================
   LATEST ARTICLE CARD
   ========================================================= */

const BlogCard = ({
  blog,
}) => (
  <article className="landzo-public-blog-card">

    <Link
      className="landzo-public-blog-card-link"
      to={`/blogs/${blog.slug}`}
    >

      <BlogImage
        alt={blog.title}
        image={blog.featuredImage}
      />


      <div className="landzo-public-blog-card-copy">

        {blog.category ? (
          <span className="landzo-public-blog-category">
            {blog.category}
          </span>
        ) : null}


        <h3>
          {blog.title}
        </h3>


        {blog.excerpt ? (
          <p>
            {blog.excerpt}
          </p>
        ) : null}


        <BlogMeta
          blog={blog}
          showViews
        />

      </div>

    </Link>


    <BlogSaveButton
      blog={blog}
    />

  </article>
);

/* =========================================================
   PAGE
   ========================================================= */

export const PublicBlogsPage =
  () => {
    const [
      searchParams,
      setSearchParams,
    ] =
      useSearchParams();


    const [
      response,
      setResponse,
    ] = useState({
      blogs: [],
      categories: [],
      featuredBlog: null,
      meta: {},
    });


    const [
      isLoading,
      setIsLoading,
    ] = useState(true);


    const [
      error,
      setError,
    ] = useState("");


    const search =
      searchParams
        .get("search")
        ?.trim() ||
      "";


    const category =
      searchParams
        .get("category")
        ?.trim() ||
      "";


    const requestedPage =
      Number(
        searchParams.get(
          "page",
        ) || 1,
      );


    const page =
      Number.isInteger(
        requestedPage,
      ) &&
      requestedPage > 0
        ? requestedPage
        : 1;


    const [
      searchInput,
      setSearchInput,
    ] =
      useState(search);


    /* =====================================================
       KEEP SEARCH INPUT SYNCED
       ===================================================== */

    useEffect(() => {
      setSearchInput(
        search,
      );
    }, [
      search,
    ]);


    /* =====================================================
       FETCH BLOGS
       ===================================================== */

    useEffect(() => {
      let ignore = false;


      const loadBlogs =
        async () => {
          try {
            setIsLoading(
              true,
            );

            setError("");


            const result =
              await listPublishedBlogs(
                buildParams({
                  category,
                  page,
                  search,
                }),
              );


            if (!ignore) {
              setResponse({
                blogs:
                  result.data ||
                  [],

                categories:
                  result.meta
                    ?.categories ||
                  [],

                featuredBlog:
                  result.meta
                    ?.featuredBlog ||
                  null,

                meta:
                  result.meta ||
                  {},
              });
            }
          } catch (
            requestError
          ) {
            if (!ignore) {
              setResponse({
                blogs: [],
                categories: [],
                featuredBlog: null,
                meta: {},
              });


              setError(
                getPublicApiErrorMessage(
                  requestError,
                ),
              );
            }
          } finally {
            if (!ignore) {
              setIsLoading(
                false,
              );
            }
          }
        };


      void loadBlogs();


      return () => {
        ignore = true;
      };
    }, [
      category,
      page,
      search,
    ]);


    /* =====================================================
       FEATURED / LATEST
       ===================================================== */

    const featuredBlog =
      response.featuredBlog;


    const visibleBlogs =
      useMemo(
        () =>
          response.blogs.filter(
            (blog) =>
              blog.id !==
              featuredBlog?.id,
          ),
        [
          featuredBlog?.id,
          response.blogs,
        ],
      );


    const totalPages =
      Math.max(
        Number(
          response.meta
            .totalPages,
        ) || 1,

        1,
      );


    /* =====================================================
       QUERY
       ===================================================== */

    const updateQuery = (
      updates,
    ) => {
      const next =
        new URLSearchParams(
          searchParams,
        );


      Object.entries(
        updates,
      ).forEach(
        ([
          key,
          value,
        ]) => {
          if (value) {
            next.set(
              key,
              value,
            );
          } else {
            next.delete(
              key,
            );
          }
        },
      );


      next.set(
        "page",
        "1",
      );


      setSearchParams(
        next,
      );
    };


    const handleSearch = (
      event,
    ) => {
      event.preventDefault();

      updateQuery({
        search:
          searchInput.trim(),
      });
    };


    const handlePageChange = (
      nextPage,
    ) => {
      const next =
        new URLSearchParams(
          searchParams,
        );

      next.set(
        "page",
        String(nextPage),
      );

      setSearchParams(
        next,
      );
    };


    const handleViewAll =
      () => {
        setSearchInput("");

        setSearchParams(
          new URLSearchParams(),
        );
      };


    return (
      <section className="landzo-public-blog-page">

        {/* ===============================================
            SAME HEADER SEARCH AS PROPERTY PAGE
            =============================================== */}

        <section
          className="
            public-properties-hero
            landzo-properties-hero
            landzo-blog-search-hero
          "
        >

          <div
            aria-hidden="true"
            className="landzo-properties-hero-overlay"
          />


          <form
            className="
              landzo-properties-search-form
              landzo-blog-search-form
            "
            onSubmit={
              handleSearch
            }
          >

            <SearchIcon />


            <input
              aria-label="Search articles"
              maxLength={80}
              onChange={(
                event,
              ) =>
                setSearchInput(
                  event.target
                    .value,
                )
              }
              placeholder="Search blogs, topics or keywords..."
              type="search"
              value={
                searchInput
              }
            />


            <button
              aria-label="Search articles"
              className="
                landzo-properties-search-filter
                landzo-blog-search-submit
              "
              type="submit"
            >
              <TuneIcon />
            </button>

          </form>

        </section>


        {/* ===============================================
            CONTENT
            =============================================== */}

        <div className="landzo-public-blog-shell landzo-public-blog-content">

          {/* =============================================
              CATEGORIES
              ============================================= */}

          <div
            aria-label="Blog categories"
            className="landzo-public-blog-categories"
          >

            <button
              className={
                !category
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                updateQuery({
                  category: "",
                })
              }
              type="button"
            >
              All articles
            </button>


            {response.categories.map(
              (item) => (
                <button
                  className={
                    category ===
                    item
                      ? "is-active"
                      : ""
                  }
                  key={item}
                  onClick={() =>
                    updateQuery({
                      category:
                        item,
                    })
                  }
                  type="button"
                >
                  {item}
                </button>
              ),
            )}

          </div>


          {/* =============================================
              ERROR
              ============================================= */}

          {error ? (
            <div
              className="public-empty-state"
              role="alert"
            >
              <p>
                {error}
              </p>
            </div>
          ) : null}


          {/* =============================================
              LOADING
              ============================================= */}

          {isLoading ? (
            <div
              aria-live="polite"
              className="landzo-public-blog-loading"
            >
              Loading articles...
            </div>
          ) : null}


          {/* =============================================
              FEATURED ARTICLE
              ============================================= */}

          {!isLoading &&
          !error &&
          featuredBlog ? (
            <section className="landzo-public-blog-featured">

              <div className="landzo-public-blog-section-heading">

                <h2>
                  Featured article
                </h2>

              </div>


              <article className="landzo-public-blog-featured-card">

                <Link
                  to={`/blogs/${featuredBlog.slug}`}
                >

                  <BlogImage
                    alt={
                      featuredBlog.title
                    }
                    image={
                      featuredBlog.featuredImage
                    }
                  />


                  <div className="landzo-public-blog-featured-copy">

                    {featuredBlog.category ? (
                      <span className="landzo-public-blog-category">
                        {
                          featuredBlog.category
                        }
                      </span>
                    ) : null}


                    <h3>
                      {
                        featuredBlog.title
                      }
                    </h3>


                    {featuredBlog.excerpt ? (
                      <p>
                        {
                          featuredBlog.excerpt
                        }
                      </p>
                    ) : null}


                    {/* Reference featured card:
                        date + reading time only */}

                    <BlogMeta
                      blog={
                        featuredBlog
                      }
                    />

                  </div>

                </Link>

              </article>

            </section>
          ) : null}


          {/* =============================================
              LATEST ARTICLES
              ============================================= */}

          {!isLoading &&
          !error ? (
            <section className="landzo-public-blog-latest">

              <div className="landzo-public-blog-section-heading">

                <h2>
                  Latest articles
                </h2>


                <button
                  className="landzo-public-blog-view-all"
                  onClick={
                    handleViewAll
                  }
                  type="button"
                >
                  View All{" "}
                  {"\u2192"}
                </button>

              </div>


              {visibleBlogs.length ? (
                <div className="landzo-public-blog-grid">

                  {visibleBlogs.map(
                    (blog) => (
                      <BlogCard
                        blog={blog}
                        key={
                          blog.id ||
                          blog.slug
                        }
                      />
                    ),
                  )}

                </div>
              ) : (
                <div className="public-empty-state">

                  <p>
                    No published articles match this search.
                  </p>

                </div>
              )}


              {/* =========================================
                  PAGINATION
                  ========================================= */}

              {totalPages > 1 ? (
                <nav
                  aria-label="Blog pagination"
                  className="landzo-public-blog-pagination"
                >

                  <button
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      handlePageChange(
                        page - 1,
                      )
                    }
                    type="button"
                  >
                    Previous
                  </button>


                  <span>
                    Page {page} of{" "}
                    {totalPages}
                  </span>


                  <button
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      handlePageChange(
                        page + 1,
                      )
                    }
                    type="button"
                  >
                    Next
                  </button>

                </nav>
              ) : null}

            </section>
          ) : null}

        </div>

      </section>
    );
  };
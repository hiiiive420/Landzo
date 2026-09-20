import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getPublishedBlogBySlug,
  incrementBlogView,
  listPublishedBlogs,
} from "../../api/blogs.api";

import {
  getPublicApiErrorMessage,
} from "../../api/publicApiClient";

import {
  sanitizeBlogHtml,
} from "../../pages/admin/blogs/blog.helpers";


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
      month: "long",
      year: "numeric",
    },
  ).format(date);
};


const getReadingTime = (
  value,
) =>
  Number.isFinite(value) &&
  value > 0
    ? `${value} min read`
    : "";


/* =========================================================
   ICONS
   ========================================================= */

const BackIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M15 5 8 12l7 7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);


const CalendarIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="14"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="M8 3v5M16 3v5M4 10h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);


const ClockIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <circle
      cx="12"
      cy="12"
      r="8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="M12 7v5l3 2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
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
      d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />

    <circle
      cx="12"
      cy="12"
      r="2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);


/* =========================================================
   COVER
   ========================================================= */

const BlogCover = ({
  blog,
}) => (
  <div className="landzo-public-blog-detail-cover">

    {blog.featuredImage?.url ? (
      <img
        alt={
          blog.featuredImage.alt ||
          blog.title
        }
        loading="eager"
        src={
          blog.featuredImage.url
        }
      />
    ) : (
      <div
        aria-hidden="true"
        className="landzo-public-blog-detail-cover-fallback"
      />
    )}

  </div>
);


/* =========================================================
   RELATED CARD
   ========================================================= */

const RelatedBlogCard = ({
  blog,
}) => (
  <Link
    className="landzo-blog-related-card"
    to={`/blogs/${blog.slug}`}
  >

    <div className="landzo-blog-related-image">

      {blog.featuredImage?.url ? (
        <img
          alt={
            blog.featuredImage.alt ||
            blog.title
          }
          loading="lazy"
          src={
            blog.featuredImage.url
          }
        />
      ) : (
        <span
          aria-hidden="true"
          className="landzo-public-blog-image-fallback"
        />
      )}

    </div>


    <div className="landzo-blog-related-copy">

      {blog.category ? (
        <span className="landzo-public-blog-category">
          {blog.category}
        </span>
      ) : null}


      <strong>
        {blog.title}
      </strong>


      <div className="landzo-blog-related-meta">

        {blog.readingTime ? (
          <span>
            {blog.readingTime} min read
          </span>
        ) : null}


        {Number.isFinite(
          blog.views,
        ) ? (
          <span>
            <EyeIcon />
            {blog.views}
          </span>
        ) : null}

      </div>

    </div>

  </Link>
);


/* =========================================================
   PAGE
   ========================================================= */

export const PublicBlogDetailPage =
  () => {
    const {
      slug,
    } = useParams();


    const [
      blog,
      setBlog,
    ] = useState(null);


    const [
      latestBlogs,
      setLatestBlogs,
    ] = useState([]);


    const [
      isLoading,
      setIsLoading,
    ] = useState(true);


    const [
      error,
      setError,
    ] = useState("");


    const trackedSlug =
      useRef(null);


    /* =====================================================
       LOAD ARTICLE
       ===================================================== */

    useEffect(() => {
      let ignore = false;


      const loadBlog =
        async () => {
          try {
            setIsLoading(
              true,
            );

            setError("");


            const [
              loadedBlog,
              latestResponse,
            ] =
              await Promise.all([
                getPublishedBlogBySlug(
                  slug,
                ),

                listPublishedBlogs({
                  limit: 4,
                  sort: "publishDate",
                }),
              ]);


            if (!ignore) {
              setBlog(
                loadedBlog,
              );

              setLatestBlogs(
                latestResponse.data ||
                [],
              );
            }
          } catch (
            requestError
          ) {
            if (!ignore) {
              setBlog(null);

              setLatestBlogs(
                [],
              );

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


      void loadBlog();


      return () => {
        ignore = true;
      };
    }, [
      slug,
    ]);


    /* =====================================================
       RECORD VIEW
       ===================================================== */

    useEffect(() => {
      if (
        !blog?.id ||
        blog.slug !== slug ||
        trackedSlug.current ===
          slug
      ) {
        return;
      }


      trackedSlug.current =
        slug;


      const recordView =
        async () => {
          try {
            const result =
              await incrementBlogView(
                blog.id,
              );


            setBlog(
              (current) =>
                current?.id ===
                blog.id
                  ? {
                      ...current,
                      views:
                        result.views,
                    }
                  : current,
            );
          } catch {
            /*
             * View recording must
             * never interrupt reading.
             */
          }
        };


      void recordView();
    }, [
      blog?.id,
      blog?.slug,
      slug,
    ]);


    /* =====================================================
       SANITIZED BODY
       ===================================================== */

    const body =
      useMemo(
        () =>
          sanitizeBlogHtml(
            blog?.content ||
            "",
          ),
        [
          blog?.content,
        ],
      );


    /* =====================================================
       RELATED ARTICLES
       ===================================================== */

    const relatedBlogs =
      useMemo(
        () =>
          latestBlogs
            .filter(
              (item) =>
                item.slug !==
                blog?.slug,
            )
            .slice(0, 3),
        [
          blog?.slug,
          latestBlogs,
        ],
      );


    const relatedTrackRef =
      useRef(null);


    useEffect(() => {
      if (
        relatedBlogs.length <= 2 ||
        typeof window === "undefined"
      ) {
        return undefined;
      }

      const mediaQuery =
        window.matchMedia(
          "(min-width: 641px) and (max-width: 1024px)",
        );

      if (
        !mediaQuery.matches ||
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
      ) {
        const track =
          relatedTrackRef.current;

        if (!track) {
          return undefined;
        }

        let pauseTimeout;
        let interval;

        const schedule =
          () => {
            window.clearInterval(
              interval,
            );

            interval =
              window.setInterval(
                () => {
                  const card =
                    track.querySelector(
                      ".landzo-blog-related-card",
                    );

                  if (!card) {
                    return;
                  }

                  const styles =
                    window.getComputedStyle(
                      track,
                    );

                  const gap =
                    parseFloat(
                      styles.columnGap ||
                        styles.gap ||
                        "0",
                    );

                  const step =
                    card.getBoundingClientRect()
                      .width +
                    gap;

                  const atEnd =
                    track.scrollLeft +
                      track.clientWidth >=
                    track.scrollWidth - 2;

                  track.scrollTo({
                    left: atEnd
                      ? 0
                      : track.scrollLeft +
                        step,
                    behavior: "smooth",
                  });
                },
                5000,
              );
          };

        const pause =
          () => {
            window.clearTimeout(
              pauseTimeout,
            );

            window.clearInterval(
              interval,
            );
          };

        const resume =
          () => {
            pause();

            pauseTimeout =
              window.setTimeout(
                schedule,
                1200,
              );
          };

        track.addEventListener(
          "pointerenter",
          pause,
        );

        track.addEventListener(
          "pointerleave",
          resume,
        );

        track.addEventListener(
          "focusin",
          pause,
        );

        track.addEventListener(
          "focusout",
          resume,
        );

        schedule();

        return () => {
          window.clearTimeout(
            pauseTimeout,
          );

          window.clearInterval(
            interval,
          );

          track.removeEventListener(
            "pointerenter",
            pause,
          );

          track.removeEventListener(
            "pointerleave",
            resume,
          );

          track.removeEventListener(
            "focusin",
            pause,
          );

          track.removeEventListener(
            "focusout",
            resume,
          );
        };
      }

      return undefined;
    }, [
      relatedBlogs.length,
    ]);


    /* =====================================================
       STATES
       ===================================================== */

    if (isLoading) {
      return (
        <section className="landzo-public-blog-detail-page">

          <div className="landzo-public-blog-detail-state">
            Loading article...
          </div>

        </section>
      );
    }


    if (
      error ||
      !blog
    ) {
      return (
        <section className="landzo-public-blog-detail-page">

          <div
            className="landzo-public-blog-detail-state"
            role="alert"
          >

            <h1>
              Article unavailable
            </h1>

            <p>
              {error ||
                "This article is not available."}
            </p>

            <Link
              className="landzo-blog-detail-back-button"
              to="/blogs"
            >
              Browse articles
            </Link>

          </div>

        </section>
      );
    }


    const date =
      formatDate(
        blog.publishDate,
      );


    const readingTime =
      getReadingTime(
        blog.readingTime,
      );


    return (
      <article className="landzo-public-blog-detail-page">

        {/* ===============================================
            ARTICLE HEADER
            =============================================== */}

        <header className="landzo-public-blog-detail-header">

          <div className="landzo-public-blog-detail-shell">

            <div className="landzo-public-blog-detail-topline">

              <Link
                aria-label="Back to blog"
                className="landzo-public-blog-back"
                to="/blogs"
              >
                <BackIcon />

                <span>
                  Back to Articles
                </span>
              </Link>


              {blog.category ? (
                <span className="landzo-public-blog-detail-category">
                  {
                    blog.category
                  }
                </span>
              ) : null}

            </div>


            <h1>
              {blog.title}
            </h1>


            {blog.excerpt ? (
              <p className="landzo-public-blog-detail-excerpt">
                {
                  blog.excerpt
                }
              </p>
            ) : null}


            <div className="landzo-public-blog-detail-meta">

              {blog.author
                ?.fullName ? (
                <span className="landzo-blog-author">
                  By{" "}
                  {
                    blog.author
                      .fullName
                  }
                </span>
              ) : null}


              {date ? (
                <span>
                  <CalendarIcon />

                  {date}
                </span>
              ) : null}


              {readingTime ? (
                <span>
                  <ClockIcon />

                  {readingTime}
                </span>
              ) : null}


              {Number.isFinite(
                blog.views,
              ) ? (
                <span>
                  <EyeIcon />

                  {blog.views}{" "}
                  {blog.views === 1
                    ? "view"
                    : "views"}
                </span>
              ) : null}

            </div>

          </div>

        </header>


        {/* ===============================================
            ARTICLE CONTENT
            =============================================== */}

        <div className="landzo-public-blog-detail-shell landzo-public-blog-detail-content">

          <BlogCover
            blog={blog}
          />


          {body ? (
            <div
              className="landzo-public-blog-detail-body"
              dangerouslySetInnerHTML={{
                __html: body,
              }}
            />
          ) : null}


          {/* =============================================
              CONTINUE READING
              ============================================= */}

          {relatedBlogs.length ? (
            <section className="landzo-public-blog-related">

              <div className="landzo-blog-related-heading">

                <h2>
                  Continue reading
                </h2>


                <Link to="/blogs">
                  View All
                </Link>

              </div>


              <div
                className="landzo-blog-related-list"
                ref={relatedTrackRef}
              >

                {relatedBlogs.map(
                  (item) => (
                    <RelatedBlogCard
                      blog={item}
                      key={
                        item.id ||
                        item.slug
                      }
                    />
                  ),
                )}

              </div>

            </section>
          ) : null}

        </div>

      </article>
    );
  };
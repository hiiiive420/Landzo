import {  useEffect,  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  listPublicLocations,
} from "../../api/publicLocations.api";

import {
  listPublicProperties,
} from "../../api/publicProperties.api";

import {
  publicCurrencies,
  publicPropertySortOptions,
  publicPropertyStatuses,
  publicPropertyTypes,
  publicTransactionTypes,
} from "../../utils/publicPropertyOptions";

import { PublicPropertyCard } from "../components/PublicPropertyCard";
import { LandzoFilterSelect } from "../components/LandzoFilterSelect";


const DEFAULT_LIMIT = 12;


/* =========================================================
   DEFAULT FILTERS
   ========================================================= */

const createDefaultFilters = () => ({
  search: "",
  type: "",
  transactionType: "",
  status: "",
  currency: "",

  province: "",
  district: "",
  city: "",
  area: "",

  sort: "newest",
});


/* =========================================================
   API PARAMS
   ========================================================= */

const buildPropertyParams = ({
  filters,
  limit = DEFAULT_LIMIT,
  page,
}) => {
  const params = {
    page,
    limit,

    sort:
      filters.sort ||
      "newest",
  };


  if (
    filters.search.trim()
  ) {
    params.search =
      filters.search.trim();
  }


  if (filters.type) {
    params.type =
      filters.type;
  }


  if (
    filters.transactionType
  ) {
    params.transactionType =
      filters.transactionType;
  }


  if (filters.status) {
    params.status =
      filters.status;
  }


  if (filters.currency) {
    params.currency =
      filters.currency;
  }


  if (filters.province) {
    params.provinceId =
      filters.province;
  }


  if (filters.district) {
    params.districtId =
      filters.district;
  }


  if (filters.city) {
    params.cityId =
      filters.city;
  }


  if (filters.area) {
    params.areaId =
      filters.area;
  }


  return params;
};


/* =========================================================
   URL -> FILTERS
   ========================================================= */

const createFiltersFromSearchParams = (
  searchParams,
) => {
  const filters =
    createDefaultFilters();


  [
    "search",
    "type",
    "transactionType",
    "status",
    "currency",
    "province",
    "district",
    "city",
    "area",
    "sort",
  ].forEach((key) => {
    const value =
      searchParams.get(key);

    if (value) {
      filters[key] =
        value.trim();
    }
  });


  return filters;
};


/* =========================================================
   FILTER DEPENDENCIES
   ========================================================= */

const updateFilterValue = (
  filters,
  field,
  value,
) => {
  const next = {
    ...filters,

    [field]:
      value,
  };


  /*
   * Province changes invalidate
   * District -> City -> Area
   */

  if (
    field ===
    "province"
  ) {
    next.district = "";
    next.city = "";
    next.area = "";
  }


  /*
   * District changes invalidate
   * City -> Area
   */

  if (
    field ===
    "district"
  ) {
    next.city = "";
    next.area = "";
  }


  /*
   * City changes invalidate Area
   */

  if (
    field ===
    "city"
  ) {
    next.area = "";
  }


  return next;
};


/* =========================================================
   SEARCH SUGGESTION HELPERS
   ========================================================= */

const getSuggestionSearchValue = (
  property,
) =>
  property.title ||
  property.code ||
  "";


const getSuggestionLocation = (
  property,
) => {
  const location =
    property.location ||
    {};


  return [
    location.displayAddress,
    location.area?.name,
    location.city?.name,
    location.district?.name,
    location.province?.name,
  ]
    .filter(Boolean)
    .join(", ");
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


const MoreFiltersIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-properties-more-icon"
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
      fill="currentColor"
      r="1.6"
    />

    <circle
      cx="9"
      cy="12"
      fill="currentColor"
      r="1.6"
    />

    <circle
      cx="16"
      cy="17"
      fill="currentColor"
      r="1.6"
    />
  </svg>
);


const GridIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-properties-grid-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <rect
      fill="none"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
      width="5"
      x="4"
      y="4"
    />

    <rect
      fill="none"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
      width="5"
      x="15"
      y="4"
    />

    <rect
      fill="none"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
      width="5"
      x="4"
      y="15"
    />

    <rect
      fill="none"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
      width="5"
      x="15"
      y="15"
    />
  </svg>
);


/* =========================================================
   COMPACT SELECT
   ========================================================= */

/* =========================================================
   PAGE
   ========================================================= */

export const PublicPropertiesPage =
  () => {
    const [
      searchParams,
    ] =
      useSearchParams();


    const searchContainerRef =
      useRef(null);


    /* =====================================================
       FILTER STATE
       ===================================================== */

    const [
      draftFilters,
      setDraftFilters,
    ] =
      useState(() =>
        createFiltersFromSearchParams(
          searchParams,
        ),
      );


    const [
      appliedFilters,
      setAppliedFilters,
    ] =
      useState(() =>
        createFiltersFromSearchParams(
          searchParams,
        ),
      );


    const [
      page,
      setPage,
    ] =
      useState(1);


    const [
      showMoreFilters,
      setShowMoreFilters,
    ] =
      useState(false);


    /* =====================================================
       LOCATION STATE

       allDistricts = complete Sri Lankan district list
       districts    = currently visible district options
       ===================================================== */

    const [
      locationOptions,
      setLocationOptions,
    ] =
      useState({
        provinces: [],

        districts: [],

        cities: [],
        areas: [],
      });


    const [
      locationLoading,
      setLocationLoading,
    ] =
      useState({
        provinces: false,
        districts: false,
        cities: false,
        areas: false,
      });


    const [
      requestKey,
      setRequestKey,
    ] =
      useState(0);


    /* =====================================================
       PROPERTY RESULT STATE
       ===================================================== */

    const [
      state,
      setState,
    ] =
      useState({
        properties: [],

        meta: {
          page: 1,
          limit:
            DEFAULT_LIMIT,
          total: 0,
          totalPages: 0,
        },

        isLoading: true,
        isError: false,
      });


    /* =====================================================
       SEARCH SUGGESTIONS
       ===================================================== */

    const [
      searchSuggestions,
      setSearchSuggestions,
    ] =
      useState({
        properties: [],
        isLoading: false,
        isOpen: false,
        activeIndex: -1,
      });


    /* =====================================================
       LOAD PROVINCES
       ===================================================== */

    useEffect(() => {
      let isMounted = true;

      const loadProvinces = async () => {
        setLocationLoading((current) => ({ ...current, provinces: true }));

        try {
          const response = await listPublicLocations({ level: "province", limit: 100 });

          if (!isMounted) {
            return;
          }

          setLocationOptions((current) => ({ ...current, provinces: response.data ?? [] }));
        } catch {
          if (isMounted) {
            setLocationOptions((current) => ({ ...current, provinces: [] }));
          }
        } finally {
          if (isMounted) {
            setLocationLoading((current) => ({ ...current, provinces: false }));
          }
        }
      };

      void loadProvinces();

      return () => {
        isMounted = false;
      };
    }, []);

    /* =====================================================
       DISTRICT OPTIONS
       ===================================================== */

    useEffect(() => {
      let isMounted = true;

      const loadDistricts = async () => {
        if (!draftFilters.province) {
          setLocationOptions((current) => ({
            ...current,
            districts: [],
            cities: [],
            areas: [],
          }));
          return;
        }

        setLocationLoading((current) => ({ ...current, districts: true }));

        try {
          const response = await listPublicLocations({
            level: "district",
            parentId: draftFilters.province,
            limit: 100,
          });

          if (!isMounted) {
            return;
          }

          setLocationOptions((current) => ({
            ...current,
            districts: response.data ?? [],
            cities: [],
            areas: [],
          }));
        } catch {
          if (isMounted) {
            setLocationOptions((current) => ({
              ...current,
              districts: [],
              cities: [],
              areas: [],
            }));
          }
        } finally {
          if (isMounted) {
            setLocationLoading((current) => ({ ...current, districts: false }));
          }
        }
      };

      void loadDistricts();

      return () => {
        isMounted = false;
      };
    }, [draftFilters.province]);


    /* =====================================================
       CITY OPTIONS

       Only requires District.
       Province is NOT required.
       ===================================================== */

    useEffect(() => {
      let isMounted = true;


      const loadCities =
        async () => {

          if (
            !draftFilters.district
          ) {
            setLocationOptions(
              (current) => ({
                ...current,

                cities: [],
                areas: [],
              }),
            );

            return;
          }


          setLocationLoading(
            (current) => ({
              ...current,

              cities:
                true,
            }),
          );


          try {
            const response =
              await listPublicLocations({
                level:
                  "city",

                parentId:
                  draftFilters.district,

                limit: 100,
              });


            if (!isMounted) {
              return;
            }


            setLocationOptions(
              (current) => ({
                ...current,

                cities:
                  response.data ??
                  [],

                areas: [],
              }),
            );
          } catch {
            if (!isMounted) {
              return;
            }


            setLocationOptions(
              (current) => ({
                ...current,

                cities: [],
                areas: [],
              }),
            );
          } finally {
            if (isMounted) {
              setLocationLoading(
                (current) => ({
                  ...current,

                  cities:
                    false,
                }),
              );
            }
          }
        };


      void loadCities();


      return () => {
        isMounted = false;
      };
    }, [
      draftFilters.district,
    ]);


    /* =====================================================
       AREA OPTIONS

       Only requires City.
       ===================================================== */

    useEffect(() => {
      let isMounted = true;


      const loadAreas =
        async () => {

          if (
            !draftFilters.city
          ) {
            setLocationOptions(
              (current) => ({
                ...current,

                areas: [],
              }),
            );

            return;
          }


          setLocationLoading(
            (current) => ({
              ...current,

              areas:
                true,
            }),
          );


          try {
            const response =
              await listPublicLocations({
                level:
                  "area",

                parentId:
                  draftFilters.city,

                limit: 100,
              });


            if (!isMounted) {
              return;
            }


            setLocationOptions(
              (current) => ({
                ...current,

                areas:
                  response.data ??
                  [],
              }),
            );
          } catch {
            if (!isMounted) {
              return;
            }


            setLocationOptions(
              (current) => ({
                ...current,

                areas: [],
              }),
            );
          } finally {
            if (isMounted) {
              setLocationLoading(
                (current) => ({
                  ...current,

                  areas:
                    false,
                }),
              );
            }
          }
        };


      void loadAreas();


      return () => {
        isMounted = false;
      };
    }, [
      draftFilters.city,
    ]);


    /* =====================================================
       LOAD PROPERTIES
       ===================================================== */

    useEffect(() => {
      let isCurrent = true;


      const loadProperties =
        async () => {

          setState(
            (current) => ({
              ...current,

              isLoading:
                true,

              isError:
                false,
            }),
          );


          try {
            const result =
              await listPublicProperties(
                buildPropertyParams({
                  filters:
                    appliedFilters,

                  page,
                }),
              );


            if (!isCurrent) {
              return;
            }


            setState({
              properties:
                result.data ||
                [],


              meta: {
                page:
                  result.meta
                    ?.page ??
                  page,


                limit:
                  result.meta
                    ?.limit ??
                  DEFAULT_LIMIT,


                total:
                  result.meta
                    ?.total ??
                  0,


                totalPages:
                  result.meta
                    ?.totalPages ??
                  0,
              },


              isLoading:
                false,

              isError:
                false,
            });
          } catch {
            if (!isCurrent) {
              return;
            }


            setState(
              (current) => ({
                ...current,

                properties:
                  [],

                isLoading:
                  false,

                isError:
                  true,
              }),
            );
          }
        };


      void loadProperties();


      return () => {
        isCurrent = false;
      };
    }, [
      appliedFilters,
      page,
      requestKey,
    ]);


    /* =====================================================
       SEARCH SUGGESTIONS
       ===================================================== */

    useEffect(() => {
      const searchTerm =
        draftFilters.search.trim();


      if (
        searchTerm.length < 2
      ) {
        setSearchSuggestions(
          (current) => ({
            ...current,

            properties: [],
            isLoading: false,
            isOpen: false,
            activeIndex: -1,
          }),
        );

        return undefined;
      }


      let isCurrent = true;


      const timeoutId =
        window.setTimeout(
          async () => {

            setSearchSuggestions(
              (current) => ({
                ...current,

                isLoading:
                  true,

                isOpen:
                  true,

                activeIndex:
                  -1,
              }),
            );


            try {
              const result =
                await listPublicProperties(
                  buildPropertyParams({
                    filters: {
                      ...appliedFilters,

                      search:
                        searchTerm,
                    },

                    limit: 5,
                    page: 1,
                  }),
                );


              if (!isCurrent) {
                return;
              }


              setSearchSuggestions({
                properties:
                  (
                    result.data ||
                    []
                  ).slice(
                    0,
                    5,
                  ),

                isLoading:
                  false,

                isOpen:
                  true,

                activeIndex:
                  -1,
              });
            } catch {
              if (!isCurrent) {
                return;
              }


              setSearchSuggestions({
                properties: [],
                isLoading: false,
                isOpen: false,
                activeIndex: -1,
              });
            }
          },
          300,
        );


      return () => {
        isCurrent = false;

        window.clearTimeout(
          timeoutId,
        );
      };
    }, [
      appliedFilters,
      draftFilters.search,
    ]);


    /* =====================================================
       CLOSE SEARCH SUGGESTIONS
       ===================================================== */

    useEffect(() => {
      if (
        !searchSuggestions.isOpen
      ) {
        return undefined;
      }


      const handlePointerDown =
        (event) => {

          if (
            searchContainerRef
              .current
              ?.contains(
                event.target,
              )
          ) {
            return;
          }


          setSearchSuggestions(
            (current) => ({
              ...current,

              isOpen:
                false,

              activeIndex:
                -1,
            }),
          );
        };


      const handleEscape =
        (event) => {

          if (
            event.key ===
            "Escape"
          ) {
            setSearchSuggestions(
              (current) => ({
                ...current,

                isOpen:
                  false,

                activeIndex:
                  -1,
              }),
            );
          }
        };


      document.addEventListener(
        "pointerdown",
        handlePointerDown,
      );


      document.addEventListener(
        "keydown",
        handleEscape,
      );


      return () => {
        document.removeEventListener(
          "pointerdown",
          handlePointerDown,
        );


        document.removeEventListener(
          "keydown",
          handleEscape,
        );
      };
    }, [
      searchSuggestions.isOpen,
    ]);


    /* =====================================================
       SEARCH HELPERS
       ===================================================== */

    const closeSearchSuggestions =
      () => {

        setSearchSuggestions(
          (current) => ({
            ...current,

            isOpen:
              false,

            activeIndex:
              -1,
          }),
        );
      };


    /* =====================================================
       UPDATE DRAFT FILTER
       ===================================================== */

    const updateDraftFilter = (
      field,
      value,
      options = {},
    ) => {

      const shouldApply =
        options
          .applyImmediately ===
        true;


      setDraftFilters(
        (current) =>
          updateFilterValue(
            current,
            field,
            value,
          ),
      );


      if (
        field === "search" &&
        value.trim().length < 2
      ) {
        setSearchSuggestions({
          properties: [],
          isLoading: false,
          isOpen: false,
          activeIndex: -1,
        });
      }


      if (shouldApply) {
        setAppliedFilters(
          (current) =>
            updateFilterValue(
              current,
              field,
              value,
            ),
        );

        setPage(1);
      }
    };


    /* =====================================================
       DIRECT DISTRICT CHANGE

       District is allowed without Province.

       If a user manually picks a District,
       City + Area are cleared automatically.
       ===================================================== */

    const handleDistrictChange = (
      event,
    ) => {
      const value =
        event.target.value;


      setDraftFilters(
        (current) => ({
          ...current,

          district:
            value,

          city: "",
          area: "",
        }),
      );
    };


    /* =====================================================
       CITY
       ===================================================== */

    const handleCityChange = (
      event,
    ) => {
      const value =
        event.target.value;


      setDraftFilters(
        (current) => ({
          ...current,

          city:
            value,

          area: "",
        }),
      );
    };


    /* =====================================================
       AREA
       ===================================================== */

    const handleAreaChange = (
      event,
    ) => {
      setDraftFilters(
        (current) => ({
          ...current,

          area:
            event.target.value,
        }),
      );
    };


    /* =====================================================
       APPLY SEARCH VALUE
       ===================================================== */

    const applySearchValue =
      (value) => {

        const search =
          value.trim();


        setDraftFilters(
          (current) => ({
            ...current,

            search,
          }),
        );


        setAppliedFilters(
          (current) => ({
            ...current,

            search,
          }),
        );


        setPage(1);

        closeSearchSuggestions();
      };


    /* =====================================================
       APPLY ALL DRAFT FILTERS
       ===================================================== */

    const applyDraftFilters =
      () => {

        const nextFilters = {
          ...draftFilters,

          search:
            draftFilters
              .search
              .trim(),
        };


        setDraftFilters(
          nextFilters,
        );


        setAppliedFilters(
          nextFilters,
        );


        setPage(1);

        closeSearchSuggestions();
      };


    /* =====================================================
       SUBMIT
       ===================================================== */

    const handleSubmit = (
      event,
    ) => {
      event.preventDefault();

      applyDraftFilters();
    };


    /* =====================================================
       SEARCH KEYBOARD
       ===================================================== */

    const handleSearchKeyDown =
      (event) => {

        if (
          !searchSuggestions
            .isOpen ||
          searchSuggestions
            .properties
            .length === 0
        ) {
          return;
        }


        if (
          event.key ===
          "ArrowDown"
        ) {
          event.preventDefault();


          setSearchSuggestions(
            (current) => ({
              ...current,

              activeIndex:
                Math.min(
                  current.properties
                    .length -
                    1,

                  current.activeIndex +
                    1,
                ),
            }),
          );
        }


        if (
          event.key ===
          "ArrowUp"
        ) {
          event.preventDefault();


          setSearchSuggestions(
            (current) => ({
              ...current,

              activeIndex:
                Math.max(
                  0,

                  current.activeIndex -
                    1,
                ),
            }),
          );
        }


        if (
          event.key ===
            "Enter" &&
          searchSuggestions
            .activeIndex >= 0
        ) {
          event.preventDefault();


          const property =
            searchSuggestions
              .properties[
              searchSuggestions
                .activeIndex
            ];


          applySearchValue(
            getSuggestionSearchValue(
              property,
            ),
          );
        }
      };


    /* =====================================================
       SELECT SEARCH SUGGESTION
       ===================================================== */

    const handleSuggestionSelect =
      (property) => {

        applySearchValue(
          getSuggestionSearchValue(
            property,
          ),
        );
      };


    /* =====================================================
       CLEAR
       ===================================================== */

    const handleClear =
      () => {

        const defaults =
          createDefaultFilters();


        setDraftFilters(
          defaults,
        );


        setAppliedFilters(
          defaults,
        );


        setLocationOptions(
          (current) => ({
            ...current,

            districts: [],
            cities: [],
            areas: [],
          }),
        );


        setPage(1);


        setShowMoreFilters(
          false,
        );


        closeSearchSuggestions();
      };


    /* =====================================================
       RETRY
       ===================================================== */

    const handleRetry =
      () => {

        setRequestKey(
          (current) =>
            current + 1,
        );
      };


    /* =====================================================
       QUICK PROPERTY TYPE
       ===================================================== */

    const handleTypeTabChange = (
      value,
    ) => {

      updateDraftFilter(
        "type",
        value,
        {
          applyImmediately:
            true,
        },
      );
    };


    /* =====================================================
       SORT
       ===================================================== */

    const handleSortChange = (
      event,
    ) => {

      updateDraftFilter(
        "sort",
        event.target.value,
        {
          applyImmediately:
            true,
        },
      );
    };


    /* =====================================================
       PAGINATION
       ===================================================== */

    const handlePreviousPage =
      () => {

        setPage(
          (current) =>
            Math.max(
              1,
              current - 1,
            ),
        );


        window.scrollTo({
          top: 0,

          behavior:
            "smooth",
        });
      };


    const handleNextPage =
      () => {

        setPage(
          (current) =>
            Math.min(
              state.meta
                .totalPages,

              current + 1,
            ),
        );


        window.scrollTo({
          top: 0,

          behavior:
            "smooth",
        });
      };


    /* =====================================================
       RENDER
       ===================================================== */

    return (
      <>

        {/* =================================================
            SEARCH HERO
            ================================================= */}

        <section className="public-properties-hero landzo-properties-hero">

          <div
            aria-hidden="true"
            className="landzo-properties-hero-overlay"
          />


          <form
            className="landzo-properties-search-form"
            onSubmit={
              handleSubmit
            }
            ref={
              searchContainerRef
            }
          >

            <SearchIcon />


            <input
              aria-label="Search properties"
              maxLength={80}
              onChange={(
                event,
              ) =>
                updateDraftFilter(
                  "search",

                  event.target.value,
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Search location, property code or keyword..."
              type="search"
              value={
                draftFilters.search
              }
            />


            {/* SEARCH SUGGESTIONS */}

            {searchSuggestions.isOpen ? (

              <div
                className="landzo-properties-search-suggestions"
                role="listbox"
              >

                {searchSuggestions.isLoading ? (

                  <div className="landzo-properties-search-suggestion-empty">
                    Searching...
                  </div>

                ) : null}


                {!searchSuggestions.isLoading &&
                searchSuggestions.properties.length === 0 ? (

                  <div className="landzo-properties-search-suggestion-empty">
                    No matching properties
                  </div>

                ) : null}


                {!searchSuggestions.isLoading
                  ? searchSuggestions.properties.map(
                      (
                        property,
                        index,
                      ) => {

                        const locationLabel =
                          getSuggestionLocation(
                            property,
                          );


                        return (
                          <button
                            aria-selected={
                              searchSuggestions
                                .activeIndex ===
                              index
                            }
                            className={
                              searchSuggestions
                                .activeIndex ===
                              index
                                ? "is-active"
                                : ""
                            }
                            key={
                              property.id ||
                              property.code
                            }
                            onClick={() =>
                              handleSuggestionSelect(
                                property,
                              )
                            }
                            role="option"
                            type="button"
                          >

                            <strong>
                              {property.title ||
                                property.code}
                            </strong>


                            {locationLabel ? (
                              <span>
                                {locationLabel}
                              </span>
                            ) : null}

                          </button>
                        );
                      },
                    )
                  : null}

              </div>

            ) : null}


            <button
              aria-label="Show property filters"
              className="landzo-properties-search-filter"
              onClick={() =>
                setShowMoreFilters(
                  (current) =>
                    !current,
                )
              }
              type="button"
            >
              <TuneIcon />
            </button>

          </form>

        </section>


        {/* =================================================
            MAIN CONTENT
            ================================================= */}

        <section className="public-section public-properties-section landzo-properties-section">

          <div className="public-container landzo-properties-container">


            {/* ===============================================
                TYPE TABS
                =============================================== */}

            <div
              aria-label="Property type"
              className="landzo-property-type-tabs"
              role="group"
            >

              <button
                className={
                  !draftFilters.type
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  handleTypeTabChange(
                    "",
                  )
                }
                type="button"
              >
                All Properties
              </button>


              {publicPropertyTypes.map(
                (option) => (

                  <button
                    className={
                      draftFilters.type ===
                      option.value
                        ? "is-active"
                        : ""
                    }
                    key={
                      option.value
                    }
                    onClick={() =>
                      handleTypeTabChange(
                        option.value,
                      )
                    }
                    type="button"
                  >
                    {option.label}
                  </button>

                ),
              )}

            </div>


            {/* ===============================================
                FILTER FORM
                =============================================== */}

            <form
              className="public-property-filters landzo-properties-filter-form"
              onSubmit={
                handleSubmit
              }
            >

              {/* =============================================
                  QUICK FILTER GRID
                  ============================================= */}

              <div
                className="
                  landzo-properties-filter-panel
                  landzo-properties-filter-grid
                "
              >

                {/* TRANSACTION */}

                <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                  label="Buy / Rent / Lease"
                  onChange={(
                    event,
                  ) =>
                    updateDraftFilter(
                      "transactionType",

                      event.target.value,

                      {
                        applyImmediately:
                          true,
                      },
                    )
                  }
                  value={
                    draftFilters
                      .transactionType
                  }
                >

                  <option value="">
                    All
                  </option>


                  {publicTransactionTypes.map(
                    (option) => (

                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>

                    ),
                  )}

                </LandzoFilterSelect>


                {/* PROPERTY TYPE */}

                <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                  label="Property Type"
                  onChange={(
                    event,
                  ) =>
                    updateDraftFilter(
                      "type",

                      event.target.value,

                      {
                        applyImmediately:
                          true,
                      },
                    )
                  }
                  value={
                    draftFilters.type
                  }
                >

                  <option value="">
                    All Types
                  </option>


                  {publicPropertyTypes.map(
                    (option) => (

                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>

                    ),
                  )}

                </LandzoFilterSelect>


                {/* STATUS */}

                <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                  label="Status"
                  onChange={(
                    event,
                  ) =>
                    updateDraftFilter(
                      "status",

                      event.target.value,

                      {
                        applyImmediately:
                          true,
                      },
                    )
                  }
                  value={
                    draftFilters.status
                  }
                >

                  <option value="">
                    Any Status
                  </option>


                  {publicPropertyStatuses.map(
                    (option) => (

                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>

                    ),
                  )}

                </LandzoFilterSelect>


                {/* CURRENCY */}

                <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                  label="Currency"
                  onChange={(
                    event,
                  ) =>
                    updateDraftFilter(
                      "currency",

                      event.target.value,

                      {
                        applyImmediately:
                          true,
                      },
                    )
                  }
                  value={
                    draftFilters.currency
                  }
                >

                  <option value="">
                    Any Currency
                  </option>


                  {publicCurrencies.map(
                    (option) => (

                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>

                    ),
                  )}

                </LandzoFilterSelect>


<LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                    disabled={locationLoading.provinces}
                    label="Province" menuAlign="center"
                    onChange={(event) =>
                      updateDraftFilter("province", event.target.value)
                    }
                    value={draftFilters.province}
                  >
                    <option value="">
                      {locationLoading.provinces
                        ? "Loading provinces..."
                        : "All Provinces"}
                    </option>
                    {locationOptions.provinces.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </LandzoFilterSelect>

                                {/* MORE FILTERS */}

                <button
                  aria-expanded={
                    showMoreFilters
                  }
                  className="
                    landzo-properties-more-filters
                    landzo-properties-more-filters-button
                  "
                  onClick={() =>
                    setShowMoreFilters(
                      (current) =>
                        !current,
                    )
                  }
                  type="button"
                >

                  <MoreFiltersIcon />

                  <span>
                    More Filters
                  </span>

                </button>

                  

              </div>


              {/* =============================================
                  ADVANCED FILTERS
                  ============================================= */}

              {showMoreFilters ? (

                <div className="landzo-properties-advanced-filters">
                  {/* =========================================
                      DISTRICT

                      IMPORTANT:
                      NOT disabled when Province is empty.
                      ========================================= */}

                  <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                    disabled={
                      !draftFilters.province ||
                      locationLoading.districts
                    }
                    label="District"
                    onChange={
                      handleDistrictChange
                    }
                    value={
                      draftFilters
                        .district
                    }
                  >

                    <option value="">
                      {locationLoading.districts
                        ? "Loading districts..."
                        : "All Districts"}
                    </option>


                    {locationOptions.districts.map(
                      (location) => (

                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {location.name}
                        </option>

                      ),
                    )}

                  </LandzoFilterSelect>


                  {/* =========================================
                      CITY

                      Enabled only after District.
                      ========================================= */}

                  <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                    disabled={
                      !draftFilters
                        .district ||
                      locationLoading
                        .cities
                    }
                    label="City"
                    onChange={
                      handleCityChange
                    }
                    value={
                      draftFilters.city
                    }
                  >

                    <option value="">
                      {locationLoading.cities
                        ? "Loading cities..."
                        : "All Cities"}
                    </option>


                    {locationOptions.cities.map(
                      (location) => (

                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {location.name}
                        </option>

                      ),
                    )}

                  </LandzoFilterSelect>


                  {/* =========================================
                      AREA

                      Enabled only after City.
                      ========================================= */}

                  <LandzoFilterSelect className="landzo-properties-filter-control landzo-properties-filter-field"
                    disabled={
                      !draftFilters.city ||
                      locationLoading.areas
                    }
                    label="Area"
                    onChange={
                      handleAreaChange
                    }
                    value={
                      draftFilters.area
                    }
                  >

                    <option value="">
                      {locationLoading.areas
                        ? "Loading areas..."
                        : "All Areas"}
                    </option>


                    {locationOptions.areas.map(
                      (location) => (

                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {location.name}
                        </option>

                      ),
                    )}

                  </LandzoFilterSelect>


                  {/* =========================================
                      APPLY / CLEAR
                      ========================================= */}

                  <div
                    className="
                      public-property-filter-actions
                      landzo-properties-filter-actions
                      landzo-properties-advanced-actions
                    "
                  >

                    <button
                      className="
                        public-link-button
                        public-link-button-primary
                        landzo-properties-apply-filters
                      "
                      type="submit"
                    >
                      Apply Filters
                    </button>


                    <button
                      className="
                        public-link-button
                        public-link-button-secondary
                        landzo-properties-clear-filters
                      "
                      onClick={
                        handleClear
                      }
                      type="button"
                    >
                      Clear
                    </button>

                  </div>

                </div>

              ) : null}

            </form>


            {/* ===============================================
                RESULTS HEADING
                =============================================== */}

            <div className="public-property-results-heading landzo-properties-results-heading">

              <h2>

                {state.isLoading
                  ? "Loading Properties"
                  : `${state.meta.total.toLocaleString(
                      "en",
                    )} ${
                      state.meta.total ===
                      1
                        ? "Property"
                        : "Properties"
                    } Found`}

              </h2>


              <div className="landzo-properties-sort">

                <span>
                  Sort by:
                </span>


                <select
                  aria-label="Sort properties"
                  onChange={
                    handleSortChange
                  }
                  value={
                    draftFilters.sort
                  }
                >

                  {publicPropertySortOptions.map(
                    (option) => (

                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>

                    ),
                  )}

                </select>


                <button
                  aria-label="Property list view"
                  className="landzo-properties-view-button"
                  type="button"
                >
                  <GridIcon />
                </button>

              </div>

            </div>


            {/* ===============================================
                ERROR
                =============================================== */}

            {state.isError ? (

              <div className="public-empty-state">

                <h3>
                  Properties are temporarily unavailable
                </h3>

                <p>
                  Please try again shortly.
                </p>

                <button
                  className="public-link-button public-link-button-primary"
                  onClick={
                    handleRetry
                  }
                  type="button"
                >
                  Retry
                </button>

              </div>

            ) : null}


            {/* ===============================================
                LOADING
                =============================================== */}

            {state.isLoading ? (

              <div className="public-property-loading-grid landzo-properties-loading-grid">

                {Array.from({
                  length: 6,
                }).map(
                  (
                    _,
                    index,
                  ) => (

                    <div
                      aria-hidden="true"
                      className="public-property-loading-card"
                      key={
                        index
                      }
                    />

                  ),
                )}

              </div>

            ) : null}


            {/* ===============================================
                PROPERTY RESULTS
                =============================================== */}

            {!state.isLoading &&
            !state.isError &&
            state.properties.length >
              0 ? (

              <div className="public-property-list-grid landzo-properties-results">

                {state.properties.map(
                  (property) => (

                    <PublicPropertyCard
                      key={
                        property.code
                      }
                      property={
                        property
                      }
                    />

                  ),
                )}

              </div>

            ) : null}


            {/* ===============================================
                EMPTY
                =============================================== */}

            {!state.isLoading &&
            !state.isError &&
            state.properties.length ===
              0 ? (

              <div className="public-empty-state">

                <h3>
                  No properties found
                </h3>

                <p>
                  Try adjusting your search or filters.
                </p>

                <button
                  className="public-link-button public-link-button-secondary"
                  onClick={
                    handleClear
                  }
                  type="button"
                >
                  Clear Filters
                </button>

              </div>

            ) : null}


            {/* ===============================================
                PAGINATION
                =============================================== */}

            {!state.isLoading &&
            !state.isError &&
            state.meta.totalPages >
              1 ? (

              <nav
                aria-label="Property pagination"
                className="public-property-pagination"
              >

                <button
                  className="public-link-button public-link-button-secondary"
                  disabled={
                    state.meta.page <=
                    1
                  }
                  onClick={
                    handlePreviousPage
                  }
                  type="button"
                >
                  Previous
                </button>


                <span>
                  Page{" "}
                  {
                    state.meta.page
                  }{" "}
                  of{" "}
                  {
                    state.meta
                      .totalPages
                  }
                </span>


                <button
                  className="public-link-button public-link-button-secondary"
                  disabled={
                    state.meta.page >=
                    state.meta
                      .totalPages
                  }
                  onClick={
                    handleNextPage
                  }
                  type="button"
                >
                  Next
                </button>

              </nav>

            ) : null}

          </div>

        </section>

      </>
    );
  };
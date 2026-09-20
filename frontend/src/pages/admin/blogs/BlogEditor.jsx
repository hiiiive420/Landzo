import { Mark, Node, mergeAttributes } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import {
  EditorContent,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { uploadBlogEditorImage } from "../../../api/blogs.api.js";
import {
  BLOG_ALLOWED_IMAGE_TYPES,
  BLOG_EDITOR_IMAGE_WIDTHS,
  BLOG_MAX_CONTENT_IMAGES,
  BLOG_MAX_IMAGE_SIZE,
} from "./blog.constants.js";
import {
  getReadingTime,
  getWordCount,
  sanitizeBlogHtml,
} from "./blog.helpers.js";

const isExternalLink = (href = "") => {
  if (!/^https?:\/\//i.test(href)) {
    return false;
  }

  if (typeof window === "undefined") {
    return true;
  }

  try {
    return (
      new URL(href).origin !==
      window.location.origin
    );
  } catch {
    return false;
  }
};

const SmartLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    const href =
      HTMLAttributes.href || "";

    const externalAttributes =
      isExternalLink(href)
        ? {
            target: "_blank",
            rel: "noopener noreferrer",
          }
        : {};

    return [
      "a",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        externalAttributes,
      ),
      0,
    ];
  },
});

const Highlight = Mark.create({
  name: "highlight",

  parseHTML() {
    return [
      {
        tag: "mark",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      toggleHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

const TaskList = Node.create({
  name: "taskList",

  group: "block list",

  content: "taskItem+",

  parseHTML() {
    return [
      {
        tag: 'ul[data-type="task-list"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(
        HTMLAttributes,
        {
          "data-type": "task-list",
          class: "blog-task-list",
        },
      ),
      0,
    ];
  },

  addCommands() {
    return {
      insertTaskList:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              {
                type: "taskItem",
                attrs: {
                  checked: false,
                },
                content: [
                  {
                    type: "paragraph",
                  },
                ],
              },
            ],
          }),
    };
  },
});

const TaskItem = Node.create({
  name: "taskItem",

  content: "paragraph block*",

  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,

        parseHTML: (element) =>
          element.getAttribute(
            "data-checked",
          ) === "true",

        renderHTML: (attributes) => ({
          "data-checked":
            attributes.checked
              ? "true"
              : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'li[data-type="task-item"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(
        HTMLAttributes,
        {
          "data-type": "task-item",
        },
      ),
      0,
    ];
  },
});

const CmsImage = TiptapImage.extend({
  addAttributes() {
    return {
      src: {
        default: null,

        parseHTML: (element) =>
          element.matches("img")
            ? element.getAttribute("src")
            : element
                .querySelector("img")
                ?.getAttribute("src"),
      },

      alt: {
        default: "",

        parseHTML: (element) =>
          element.matches("img")
            ? element.getAttribute("alt") ||
              ""
            : element
                .querySelector("img")
                ?.getAttribute("alt") ||
              "",
      },

      title: {
        default: null,

        parseHTML: (element) =>
          element.matches("img")
            ? element.getAttribute("title")
            : element
                .querySelector("img")
                ?.getAttribute("title"),
      },

      publicId: {
        default: "",

        parseHTML: (element) =>
          element.getAttribute(
            "data-public-id",
          ) ||
          element
            .querySelector("img")
            ?.getAttribute(
              "data-public-id",
            ) ||
          "",
      },

      width: {
        default: "100%",

        parseHTML: (element) =>
          element.getAttribute(
            "data-width",
          ) || "100%",
      },

      align: {
        default: "center",

        parseHTML: (element) =>
          element.getAttribute(
            "data-align",
          ) || "center",
      },

      caption: {
        default: "",

        parseHTML: (element) =>
          element.getAttribute(
            "data-caption",
          ) ||
          element
            .querySelector("figcaption")
            ?.textContent ||
          "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-type='cms-image']",
      },
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      alt,
      title,
      publicId = "",
      width = "100%",
      align = "center",
      caption = "",
    } = HTMLAttributes;

    const widthClass = String(width)
      .replace("%", "");

    const trimmedCaption =
      String(caption || "").trim();

    const imageAttributes = {
      src,
      alt: alt || "",
      title,
      loading: "lazy",
      decoding: "async",
    };

    if (publicId) {
      imageAttributes[
        "data-public-id"
      ] = publicId;
    }

    const children = [
      [
        "img",
        mergeAttributes(
          imageAttributes,
        ),
      ],
    ];

    if (trimmedCaption) {
      children.push([
        "figcaption",
        {},
        trimmedCaption,
      ]);
    }

    return [
      "figure",
      {
        class: [
          "blog-cms-image",
          `blog-cms-image--align-${align}`,
          `blog-cms-image--width-${widthClass}`,
        ].join(" "),

        "data-type": "cms-image",
        "data-align": align,
        "data-width": width,

        ...(publicId
          ? {
              "data-public-id":
                publicId,
            }
          : {}),

        ...(trimmedCaption
          ? {
              "data-caption":
                trimmedCaption,
            }
          : {}),
      },

      ...children,
    ];
  },
});

const getImageFileKey = (file) =>
  [
    file.name,
    file.size,
    file.lastModified,
  ].join("-");

const getImageFilesFromTransfer = (
  dataTransfer,
) => {
  const directFiles = Array.from(
    dataTransfer?.files || [],
  );

  const itemFiles = Array.from(
    dataTransfer?.items || [],
  )
    .filter(
      (item) => item.kind === "file",
    )
    .map((item) => item.getAsFile())
    .filter(Boolean);

  const seen = new Set();

  return [
    ...directFiles,
    ...itemFiles,
  ].filter((file) => {
    if (
      !file.type?.startsWith(
        "image/",
      )
    ) {
      return false;
    }

    const key =
      getImageFileKey(file);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

const validateEditorImage = (
  file,
) => {
  if (!file) {
    return "Image file is required.";
  }

  if (
    !BLOG_ALLOWED_IMAGE_TYPES.includes(
      file.type,
    )
  ) {
    return "Only JPG, PNG, or WEBP images are allowed.";
  }

  if (
    file.size > BLOG_MAX_IMAGE_SIZE
  ) {
    return "Image must be 10 MB or less.";
  }

  return "";
};

const getEditorImageCount = (
  editor,
) => {
  if (!editor) {
    return 0;
  }

  let count = 0;

  editor.state.doc.descendants(
    (node) => {
      if (
        node.type.name === "image"
      ) {
        count += 1;
      }
    },
  );

  return count;
};

const isEditorReady = (editor) =>
  Boolean(
    editor &&
      !editor.isDestroyed &&
      editor.schema &&
      editor.state?.doc,
  );

const getEditorHtml = (
  editor,
  fallback = "",
) => {
  if (!isEditorReady(editor)) {
    return fallback || "";
  }

  try {
    return editor.getHTML();
  } catch {
    return fallback || "";
  }
};

function ToolbarButton({
  active = false,
  disabled = false,
  label,
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={[
        "blog-editor-toolbar-button",
        active
          ? "is-active"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function BlogEditor({
  value = "",
  onChange,
  error = "",
  title = "",
  onTitleChange,
}) {
  const fileInputRef = useRef(null);

  const editorRef = useRef(null);

  const uploadedImageKeysRef =
    useRef(new Set());

  const [isUploadingImage, setIsUploadingImage] =
    useState(false);

  const [uploadError, setUploadError] =
    useState("");

  const insertImageFile =
    useCallback(async (file) => {
      const validationError =
        validateEditorImage(file);

      if (validationError) {
        setUploadError(
          validationError,
        );

        return false;
      }

      const currentEditor =
        editorRef.current;

      if (
        !isEditorReady(
          currentEditor,
        )
      ) {
        return false;
      }

      if (
        getEditorImageCount(
          currentEditor,
        ) >=
        BLOG_MAX_CONTENT_IMAGES
      ) {
        setUploadError(
          `You can add a maximum of ${BLOG_MAX_CONTENT_IMAGES} content images.`,
        );

        return false;
      }

      const fileKey =
        getImageFileKey(file);

      if (
        uploadedImageKeysRef.current.has(
          fileKey,
        )
      ) {
        setUploadError(
          "This image has already been uploaded in this editor session.",
        );

        return false;
      }

      uploadedImageKeysRef.current.add(
        fileKey,
      );

      setUploadError("");
      setIsUploadingImage(true);

      try {
        const uploadedImage =
          await uploadBlogEditorImage({
            file,
          });

        const imageUrl =
          uploadedImage?.secureUrl ||
          uploadedImage?.url;

        const publicId =
          uploadedImage?.publicId ||
          uploadedImage?.public_id ||
          "";

        if (!imageUrl) {
          throw new Error(
            "Upload completed without an image URL.",
          );
        }

        const latestEditor =
          editorRef.current;

        if (
          !isEditorReady(
            latestEditor,
          )
        ) {
          throw new Error(
            "The editor is not available.",
          );
        }

        if (
          getEditorImageCount(
            latestEditor,
          ) >=
          BLOG_MAX_CONTENT_IMAGES
        ) {
          throw new Error(
            `You can add a maximum of ${BLOG_MAX_CONTENT_IMAGES} content images.`,
          );
        }

        latestEditor
          .chain()
          .focus()
          .setImage({
            src: imageUrl,

            alt: file.name
              .replace(
                /\.[^.]+$/,
                "",
              )
              .replace(
                /[-_]+/g,
                " ",
              ),

            width: "100%",
            align: "center",
            caption: "",
            publicId,
          })
          .run();

        return true;
      } catch (requestError) {
        uploadedImageKeysRef.current.delete(
          fileKey,
        );

        setUploadError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "Unable to upload image.",
        );

        return false;
      } finally {
        setIsUploadingImage(
          false,
        );
      }
    }, []);

  const insertImageFiles =
    useCallback(
      async (files) => {
        const imageFiles = Array.from(
          files || [],
        );

        if (!imageFiles.length) {
          return;
        }

        const editor =
          editorRef.current;

        const availableSlots =
          Math.max(
            0,
            BLOG_MAX_CONTENT_IMAGES -
              getEditorImageCount(
                editor,
              ),
          );

        if (!availableSlots) {
          setUploadError(
            `You can add a maximum of ${BLOG_MAX_CONTENT_IMAGES} content images.`,
          );

          return;
        }

        if (
          imageFiles.length >
          availableSlots
        ) {
          setUploadError(
            `Only ${availableSlots} more content image${
              availableSlots === 1
                ? ""
                : "s"
            } can be added.`,
          );
        }

        const acceptedFiles =
          imageFiles.slice(
            0,
            availableSlots,
          );

        for (const file of acceptedFiles) {
          // Sequential upload prevents multiple
          // simultaneous drops from exceeding
          // the two-image limit.
          await insertImageFile(file);
        }
      },
      [insertImageFile],
    );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [
            1,
            2,
            3,
            4,
            5,
            6,
          ],
        },
      }),

      Underline,

      Highlight,

      TaskList,

      TaskItem,

      SmartLink.configure({
        openOnClick: false,
        autolink: true,

        HTMLAttributes: {
          class:
            "blog-editor-link",
        },
      }),

      CmsImage.configure({
        inline: false,
        allowBase64: false,
      }),

      Table.configure({
        resizable: false,
      }),

      TableRow,
      TableHeader,
      TableCell,

      CharacterCount,

      Placeholder.configure({
        placeholder:
          "Write the LANDZO article...",
      }),
    ],

    content: value || "",

    editorProps: {
      attributes: {
        class:
          "blog-editor-prosemirror",
      },

      handlePaste(
        _view,
        event,
      ) {
        const imageFiles =
          getImageFilesFromTransfer(
            event.clipboardData,
          );

        if (
          !imageFiles.length
        ) {
          return false;
        }

        event.preventDefault();

        void insertImageFiles(
          imageFiles,
        );

        return true;
      },

      handleDrop(
        _view,
        event,
      ) {
        const imageFiles =
          getImageFilesFromTransfer(
            event.dataTransfer,
          );

        if (
          !imageFiles.length
        ) {
          return false;
        }

        event.preventDefault();

        void insertImageFiles(
          imageFiles,
        );

        return true;
      },

      transformPastedHTML(
        html,
      ) {
        return sanitizeBlogHtml(
          html,
        );
      },
    },

    onUpdate({
      editor: currentEditor,
    }) {
      if (
        !isEditorReady(
          currentEditor,
        )
      ) {
        return;
      }

      onChange?.(
        getEditorHtml(
          currentEditor,
        ),
      );
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!isEditorReady(editor)) {
      return;
    }

    const currentHtml =
      getEditorHtml(editor);

    if (
      value !== currentHtml
    ) {
      try {
        editor.commands.setContent(
          value || "",
          false,
        );
      } catch {
        // React development remounts can
        // briefly expose a stale Tiptap
        // editor instance.
      }
    }
  }, [editor, value]);

  if (!isEditorReady(editor)) {
    return null;
  }

  const setLink = () => {
    const previousUrl =
      editor.getAttributes(
        "link",
      ).href;

    const url = window.prompt(
      "Enter link URL",
      previousUrl ||
        "https://",
    );

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .unsetLink()
        .run();

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: url.trim(),
      })
      .run();
  };

  const updateImageAttributes = (
    attributes,
  ) => {
    if (
      !editor.isActive("image")
    ) {
      return;
    }

    editor
      .chain()
      .focus()
      .updateAttributes(
        "image",
        attributes,
      )
      .run();
  };

  const setImageCaption = () => {
    if (
      !editor.isActive("image")
    ) {
      return;
    }

    const previousCaption =
      editor.getAttributes(
        "image",
      ).caption || "";

    const caption =
      window.prompt(
        "Image caption",
        previousCaption,
      );

    if (caption === null) {
      return;
    }

    updateImageAttributes({
      caption,
    });
  };

  const setImageAlt = () => {
    if (
      !editor.isActive("image")
    ) {
      return;
    }

    const previousAlt =
      editor.getAttributes(
        "image",
      ).alt || "";

    const alt = window.prompt(
      "Image alt text",
      previousAlt,
    );

    if (alt === null) {
      return;
    }

    updateImageAttributes({
      alt,
    });
  };

  const removeSelectedImage =
    () => {
      if (
        !editor.isActive(
          "image",
        )
      ) {
        return;
      }

      editor
        .chain()
        .focus()
        .deleteSelection()
        .run();

      setUploadError("");
    };

  const editorHtml =
    getEditorHtml(
      editor,
      value,
    );

  const wordCount =
    getWordCount(editorHtml);

  const readingTime =
    getReadingTime(editorHtml);

  const imageCount =
    getEditorImageCount(editor);

  const isImageSelected =
    editor.isActive("image");

  const imageAttributes =
    editor.getAttributes(
      "image",
    );

  return (
    <div className="blog-editor">
      <div
        className={[
          "blog-editor-shell",
          error
            ? "has-error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="blog-editor-toolbar">
          <ToolbarButton
            label="Heading 1"
            active={editor.isActive(
              "heading",
              {
                level: 1,
              },
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 1,
                })
                .run()
            }
          >
            H1
          </ToolbarButton>

          <ToolbarButton
            label="Heading 2"
            active={editor.isActive(
              "heading",
              {
                level: 2,
              },
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 2,
                })
                .run()
            }
          >
            H2
          </ToolbarButton>

          {[
            3,
            4,
            5,
            6,
          ].map((level) => (
            <ToolbarButton
              key={level}
              label={`Heading ${level}`}
              active={editor.isActive(
                "heading",
                {
                  level,
                },
              )}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({
                    level,
                  })
                  .run()
              }
            >
              H{level}
            </ToolbarButton>
          ))}

          <ToolbarButton
            label="Paragraph"
            active={editor.isActive(
              "paragraph",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .setParagraph()
                .run()
            }
          >
            P
          </ToolbarButton>

          <ToolbarButton
            label="Bold"
            active={editor.isActive(
              "bold",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBold()
                .run()
            }
          >
            B
          </ToolbarButton>

          <ToolbarButton
            label="Italic"
            active={editor.isActive(
              "italic",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleItalic()
                .run()
            }
          >
            I
          </ToolbarButton>

          <ToolbarButton
            label="Underline"
            active={editor.isActive(
              "underline",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleUnderline()
                .run()
            }
          >
            U
          </ToolbarButton>

          <ToolbarButton
            label="Strike"
            active={editor.isActive(
              "strike",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleStrike()
                .run()
            }
          >
            S
          </ToolbarButton>

          <ToolbarButton
            label="Highlight"
            active={editor.isActive(
              "highlight",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleHighlight()
                .run()
            }
          >
            HL
          </ToolbarButton>

          <ToolbarButton
            label="Bullet list"
            active={editor.isActive(
              "bulletList",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBulletList()
                .run()
            }
          >
            {"\u2022 List"}
          </ToolbarButton>

          <ToolbarButton
            label="Ordered list"
            active={editor.isActive(
              "orderedList",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
            }
          >
            1. List
          </ToolbarButton>

          <ToolbarButton
            label="Blockquote"
            active={editor.isActive(
              "blockquote",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleBlockquote()
                .run()
            }
          >
            Quote
          </ToolbarButton>

          <ToolbarButton
            label="Task list"
            active={editor.isActive(
              "taskList",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTaskList()
                .run()
            }
          >
            Task
          </ToolbarButton>

          <ToolbarButton
            label="Horizontal divider"
            onClick={() =>
              editor
                .chain()
                .focus()
                .setHorizontalRule()
                .run()
            }
          >
            HR
          </ToolbarButton>

          <ToolbarButton
            label="Inline code"
            active={editor.isActive(
              "code",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleCode()
                .run()
            }
          >
            Code
          </ToolbarButton>

          <ToolbarButton
            label="Code block"
            active={editor.isActive(
              "codeBlock",
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleCodeBlock()
                .run()
            }
          >
            {"</>"}
          </ToolbarButton>

          <ToolbarButton
            label="Link"
            active={editor.isActive(
              "link",
            )}
            onClick={setLink}
          >
            Link
          </ToolbarButton>

          <ToolbarButton
            label="Insert image"
            disabled={
              isUploadingImage ||
              imageCount >=
                BLOG_MAX_CONTENT_IMAGES
            }
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            Image
          </ToolbarButton>

          <ToolbarButton
            label="Align image left"
            disabled={
              !isImageSelected
            }
            active={
              isImageSelected &&
              imageAttributes.align ===
                "left"
            }
            onClick={() =>
              updateImageAttributes({
                align: "left",
              })
            }
          >
            {"\u2190"}
          </ToolbarButton>

          <ToolbarButton
            label="Align image center"
            disabled={
              !isImageSelected
            }
            active={
              isImageSelected &&
              imageAttributes.align ===
                "center"
            }
            onClick={() =>
              updateImageAttributes({
                align: "center",
              })
            }
          >
            {"\u2194"}
          </ToolbarButton>

          <ToolbarButton
            label="Align image right"
            disabled={
              !isImageSelected
            }
            active={
              isImageSelected &&
              imageAttributes.align ===
                "right"
            }
            onClick={() =>
              updateImageAttributes({
                align: "right",
              })
            }
          >
            {"\u2192"}
          </ToolbarButton>

          {BLOG_EDITOR_IMAGE_WIDTHS.map(
            (width) => (
              <ToolbarButton
                key={width}
                label={`Image width ${width}`}
                disabled={
                  !isImageSelected
                }
                active={
                  isImageSelected &&
                  imageAttributes.width ===
                    width
                }
                onClick={() =>
                  updateImageAttributes({
                    width,
                  })
                }
              >
                {width}
              </ToolbarButton>
            ),
          )}

          <ToolbarButton
            label="Image caption"
            disabled={
              !isImageSelected
            }
            onClick={
              setImageCaption
            }
          >
            Cap
          </ToolbarButton>

          <ToolbarButton
            label="Image alt text"
            disabled={
              !isImageSelected
            }
            onClick={setImageAlt}
          >
            Alt
          </ToolbarButton>

          <ToolbarButton
            label="Remove image"
            disabled={
              !isImageSelected
            }
            onClick={
              removeSelectedImage
            }
          >
            Del
          </ToolbarButton>

          <ToolbarButton
            label="Insert table"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({
                  rows: 3,
                  cols: 3,
                  withHeaderRow: true,
                })
                .run()
            }
          >
            Table
          </ToolbarButton>

          <ToolbarButton
            label="Undo"
            onClick={() =>
              editor
                .chain()
                .focus()
                .undo()
                .run()
            }
          >
            Undo
          </ToolbarButton>

          <ToolbarButton
            label="Redo"
            onClick={() =>
              editor
                .chain()
                .focus()
                .redo()
                .run()
            }
          >
            Redo
          </ToolbarButton>

          <input
            ref={fileInputRef}
            className="blog-editor-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const files =
                Array.from(
                  event.target.files ||
                    [],
                );

              void insertImageFiles(
                files,
              );

              event.target.value =
                "";
            }}
          />
        </div>

        <div className="blog-editor-meta">
          <span>
            {isUploadingImage
              ? "Uploading image..."
              : `${imageCount}/${BLOG_MAX_CONTENT_IMAGES} images`}
          </span>

          <span>
            {wordCount} words
          </span>

          <span>
            {readingTime} min read
          </span>
        </div>

        {onTitleChange ? (
          <div className="blog-editor-title-block">
            <input
              type="text"
              value={title || ""}
              maxLength={180}
              placeholder="Article title"
              aria-label="Blog title"
              className="blog-editor-title-input"
              onChange={(event) =>
                onTitleChange(
                  event.target.value,
                )
              }
            />
          </div>
        ) : null}

        <EditorContent
          editor={editor}
        />
      </div>

      {uploadError ? (
        <p className="blog-editor-error">
          {uploadError}
        </p>
      ) : null}

      {error ? (
        <p className="blog-editor-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
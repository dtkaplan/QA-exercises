what_is_ready <- function(mode = NULL) {
  project_root <- getOption("QRA.exercise_project_root")

  if (is.null(project_root) || !dir.exists(project_root)) {
    current_dir <- normalizePath(getwd(), winslash = "/", mustWork = TRUE)

    repeat {
      if (file.exists(file.path(current_dir, "_exercise_startup.R"))) {
        project_root <- current_dir
        break
      }

      parent_dir <- dirname(current_dir)
      if (identical(parent_dir, current_dir)) {
        stop("Could not find the project root containing _exercise_startup.R.")
      }

      current_dir <- parent_dir
    }
  }

  chapter_root <- file.path(project_root, "devoirs3")
  chapter_dirs <- list.dirs(chapter_root, recursive = FALSE, full.names = TRUE)
  chapter_dirs <- sort(chapter_dirs[grepl("^Chap-[0-9]{2}$", basename(chapter_dirs))])

  read_exercise_metadata <- function(file) {
    lines <- readLines(file, warn = FALSE)
    if (length(lines) < 3 || lines[[1]] != "<!--") {
      return(list())
    }

    closing_delimiter <- which(lines[-1] == "-->")[1]
    if (is.na(closing_delimiter) || closing_delimiter < 2) {
      return(list())
    }

    metadata_lines <- lines[2:closing_delimiter]
    metadata_lines <- grep("^\\s*(status|mode):", metadata_lines, value = TRUE)
    if (length(metadata_lines) == 0) {
      return(list())
    }

    yaml::yaml.load(paste(metadata_lines, collapse = "\n"))
  }

  ready_files <- lapply(chapter_dirs, function(chapter_dir) {
    qmd_files <- list.files(chapter_dir, pattern = "\\.qmd$", full.names = TRUE)
    qmd_files[vapply(qmd_files, function(file) {
      metadata <- read_exercise_metadata(file)
      identical(metadata$status, "ready-to-use") &&
        (is.null(mode) || identical(metadata$mode, mode))
    }, logical(1))]
  })

  foo <- tibble::tibble(
    dir = rep(basename(chapter_dirs), lengths(ready_files)),
    file = basename(unlist(ready_files, use.names = FALSE))
  )

  foo
}
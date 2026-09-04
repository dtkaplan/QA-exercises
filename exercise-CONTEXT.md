For my textbook product (see ../QR-A/chat-CONTEXT.md) I am writing a large number of supplementary QMD files. Generically, I call these supplementary files "exercises." 

The exercises are contained in sub-directories, one for each chapter 1-16 in the textbook. 

Each such supplementary file is intended to serve one of the following purposes:

1. A "drill" problem, which should contain one (or up to four) questions that can be quickly (15 secs to 1 minute) answered by a student by interpreting a graph or some other information in the context of the corresponding chapter and preceeeding chapters. None but trivial calculations should be required. Questions are in multiple-choice or an equivalent format for which immediate feedback can be provided to the student. The `{devoirs}` package for R (sources at github.com/dtkaplan/devoirs) will provide the feedback mechanism. The source file contains hints or appropriate specific feedback for wrong selections.

2. An "exercise," which is a longer form of drill problem that may require some arithmetic calculation. Exercises often involve the student writing short essays. The essay capability is provided by devoirs::devoirs_text().

3. A "computer exercise," which is an exercise that includes computing in R. The webR system will be used to integrate computing capabilities into the document.

4. A "discussion item," which will be either directions to an instructor about leading an in-class discussion or the outline of a topic to be discussed in small groups along with specific questions to focus discussion.

5. A "skill developer," which rehearses for the student some non-computer calculation or reasoning

6. A "computer skill developer," which is like a "skill developer" but will involve computing using webR and, typically, a short tutorial introducing the skill and the corresponding computer commands. Ultimately, the computing commands will be either standard R or built in to the `{QRA}` package which is under development.

Which of these purposes is implemented in a supplementary file is contained in the "mode:" field in a YAML header to the supplementary file.

I want to be able to distribute these supplementary files in XXX formats:

a. Each file as a stand-along HTML document to be placed on a web server.
b. A collection of several supplemental files compiled to HTML. These will constitute an "assignment" to be provided to students via an HTML server.
c. A catalog, called "Exercises and Activities", organized by chapter and "mode:". This catalog file will be compiled to HTML and PDF formats. 

Before I start on the long process of revising the supplementary files, I want to set up a framework for organizing the files. This will consist of several parts which we will work on one at a time.

A. A header for individual files that will support them being compiled as stand-alone HTML documents. 
    - This header will replace the first R chunk currently in the files and will be able to recognize whether the file is being compiled individually, or is just one of several included in an "assignment" or "catalog."
    - The header, as it appears in the source .qmd file should be extremely short, for instance, styled as a quarto transclusion directive like  `{{< include header.qmd >}}`
    - The header.qmd file should include logic to detect whether the exercise file is being included in a larger collection such as a catalog or assignment. Assume those larger collections will use the same header.
    - Images are currently stored in the top level product directory, in a subdirectory called `www`. Markdown inclusion of images, for example `![caption]{www/image.png}` should reach out to the correct directory regardless of whether the exercise file is being compiled as stand-along or as a member of a collection.
    - The name of the exercise file is a good basis for the name of the resulting HTML file when the exercise file is being compiled in stand-alone mode.

B. An assignment collection

    1. The source file will include a human-written title and other human-written markdown.
    2. The assignment source will include as well as a list of names of the exercise files followed by the identifier to be used in the tab-panel.
    3. Each individual exercise files contents should go into a collapsable div in a tab-panel, with the tab identifiers gleaned from the list
        
C. A catalog collection. The catalog should be consist of a file "Catalog.html" which will be in each of the Chap-NN directories. 

Now to work on construction of a catalog. The idea I have involves three phases:

1. Build an R function, `make_roster()` that will take as input the name of a directory (e.g. `Chap-NN`) and have the side effect of generating a `Roster-NN.yaml` source file in the named directory.
    - Put the R function in a file, "make_roster.R" in the top-level directory of the project.


2. I will run by hand R commands like `make_roster("Chap-01")` for each of the Chap-NN directories. This will produce the "Roster-NN.yaml" files. You should not produce these yaml files yourself. `make_roster()` should implement these features.

    - All qmd files in Chap-NN should be included, regardless of status: or mode:.
    - Ignore the files in Chap-NN/Drafts
    - The yaml file will have five fields for each of the .qmd files in Chap-NN.
        - file: containing the name of the qmd file, e.g. "hamster-hit-hurricane.qmd"
        - the current status: of that qmd file.
        - the mode: of that qmd file.
        - a group: whose default value is "unclassified.
        - a rank: which will be a number I will fill in between 0 and 100. No warning necessary. Default value: 1
    - If status: or mode: is not available for a .qmd file, use the default "null". 
    - Treat the roster as the durable editorial source of truth for group and rank; regenerate file, status, and mode from the source YAML.
    - Include only *.qmd exercise sources and explicitly exclude generated Catalog-NN.qmd files when phase 3 exists.
    - Give a deterministic order in the YAML, ideally filename order initially; phase 3 can sort catalog entries by group, then numeric rank, then filename.
    - For qmd files that were mentioned in the previous Roster-NN.yaml but which have since been deleted, drop those roster rows.  

3. Write an R function, `roster2catalog()` that reads a Roster-NN.yaml file and generates a Catalog-NN.qmd file that will be compiled to HTML to constitute the catalog for the Chap-NN directory. Put `roster2catalog()` in the `make_roster.R` source file.

An outline of the Catalog-NN.qmd to be produced, where "<group-1>" stands for the group currently being considered. "fish-swims-ocean" and "birds-fly-sky" stand for exercise .qmd files.

- The order of the groups doesn't matter. Start alphabetically. But put "group: unclassified" at the end.
- Use the exercise filename's stem as the tab heading.
- If the exercise file has a status: other than ready-to-use, insert a line before the {{<include>}} shortcode that points out the status.
- Within a group, the .qmd exercise files should be inserted in order of ascending rank, low rank first, high rank later.
- If "Roster-NN.yaml" has no entries, the contents of Catalog-NN.qmd should be "no exercises have been classified for this chapter."
- If two or more files in a group have the same rank, break the tie alphabetically based on the file name.
- Rely on the startup-guard for the {{<include exercise-header.qmd >}} in the individual exercise .qmd files to avoid repetitive inclusion of that content.

```{verbatim}
---
title: "Chapter NN Catalog"
---


{{< include ../exercise-header.qmd >}}

## Group: Units

::: {.panel-tabset collapse=true}
## fish-swims-ocean

Status: draft

{{< include fish-swims-ocean.qmd >}}


## birds-fly-sky

{{< include birds-fly-sky.qmd >}}

:::

## Group: Dimensions

::: {.panel-tabset collapse=true}
## shark-swims-ocean

{{< include shark-swims-ocean.qmd >}}


## planes-fly-sky

Status: sketch

{{< include planes-fly-sky.qmd >}}

:::


```
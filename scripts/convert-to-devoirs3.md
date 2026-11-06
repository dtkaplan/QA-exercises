# Convert {devoirs} to {devoirs3}

The goal of this project is to develop a system to translate .qmd files originally written using the {devoirs} package into .qmd files that use the {devoirs3} package.

The purpose is to enable me to make a transition from {devoirs} package use to the new {devoirs3} package. We will do this in phases: 

1. translate "mcq" chunk format into the {devoirs3} "devoirs_choices" format.
2. use the "label:" and "inline:"  marker in {mcq} to create an inline R call to the `devoirs3::devoirs_selection()` function that displays the choices and their controls in the HTML target of the .qmd file.
3. Translate the top matter in the original .qmd file into the corresponding calls to {devoirs3} functions.

The {devoirs} package uses quarto chunks with the "mcq" chunk engine to implement multiple choice questions. In contrast, {devoirs3} uses chunks with a "devoirs_choices" engine to lay out the choices and feedback, then uses `devoirs_selection()` to lay out those choices for the HTML target of the qmd file.

Similarly, {devoirs} offers the `devoirs_set()` function which provides a more compact way to specify a small set of short choices, appropriate feedback, and correct answers. 

## Phase 1. Work plan

1. Identify a file to use for examples of both "mcq" and `devoirs_set()` constructions for question items. (completed) use Chap-04/spider-stand-ship.qmd

2. Create a new .qmd file that contains a random sample of about 20 "mcq" question element chunks from a variety of the existing qmd files. For the random selection use a random-number generator seed of 687. Call the file with the sample "mcq" chunks "mcq.qmd", placing it in the top level of the devoirs3/ directory. We may later expand this into a larger test set. (completed)

3. Use the sample of question elements in in "mcq.qmd" as a test bed to develop a strategy that will translate them into a corresponding file with "devoirs_choices" chunks. (completed)
    - Identify the various elements of the "mcq" chunk style such as 
        - question label, 
        - choice text in lines starting with 1., 2., and so on, 
        - identification of a correct choice with the inline markup "[correct]", 
        - providing feedback (optionally) with markup like "[hint: You should know better"]
    - Map the elements of the "mcq" style into the corresponding YAML structure used in {devoirs3}.
    - Test functionality by creating a "devoirs-choices.qmd" file with the original "mcq" chunks followed by the the translation of each into a {devoirs3} "devoirs_choices" chunk format. This file will be read by a human to judge the success of the translation strategy.
    - The `label:` field in a {devoirs3} `devoirs_choices` chunk must be a valid, unique R variable name; the chunk's YAML accepts choice text, `correct`, and optional `feedback`, but not a `qid` field. Preserve the original {devoirs} `mcq` label separately for the Phase 2 `devoirs_selection(label = ...)` call. In the review fixture, record it in a nearby comment rather than adding unsupported YAML metadata. The `inline:` marker is also used in Phase 2, not in the choice-data chunk.
    - Since the existing {devoirs} qmd files have been extensively tested, it is expected to be rare to have duplicated chunk "labels:". If there are any question elements that have multiple "correct" items, this should be translated into the {devoirs3} format which explicitly allows multiple correct items. 
    - If we do find instances in the existing {devoirs} qmd files of unsupported cases, append them to devoirs3/case-log.qmd which we can later use to develop support for such cases. Identify each such unsupported "mcq" case as such. Later on, we will focus on the cases in the log file, eliminated each by hand as we develop a strategy that will handle the case correctly.
    - Correctly translating the files in the mcq.qmd test set will mark a first milestone for the project.

4. Write an R function that will translate the "mcq"-style qmd files into the new "devoirs_choices" format. Call it mcq_to_devoirs_choices(Lines). and place it, for the time being, in a devoirs3/translations.R file. The output should be a character string vector of the sort than can be placed in a file by piping the output to writeLines().


## The algorithm for converting "mcq" to "devoirs_choices" 

1. Parse each `{mcq}` chunk as a question label, optional `inline` setting, and ordered list of choices.
2. Remove each choice prefix (`1.`, `2.`, `a.`, etc.). Join wrapped continuation lines to the preceding choice, then trim surrounding whitespace.
3. Map `[correct]` to `correct: true`; choices without it get `correct: false`.
4. Map `[hint: ...]` to the choice’s `feedback` value, removing the marker and trimming the feedback. When there’s no hint, omit `feedback` so `devoirs3` supplies its default.
5. Emit the choices as a YAML sequence in a `{devoirs_choices}` chunk. Use a unique, valid R variable name as the chunk’s `label`; quote choice text and use YAML booleans for `correct`.
6. Preserve the original MCQ label for the later `devoirs_selection(label = ...)` call, and pass the choices variable as `answers`. Preserve `inline` for that call, not as choice-chunk metadata.
7. Follow the "devoirs_choices" chunk with an ordinary R chunk that will look like the following, but with the items placed in [[double braces]] resolved to their values from the "mcq" and "devoirs_choices" chunks.

```{r echo=FALSE}
Q <- devoirs_selection(
       label = [[original MCQ label, properly escaped R string]], 
       question = "Placeholder for now",
       answers = [[R variable name from devoirs_choices chunk]],
       multiple = [[TRUE if there are multiple correct items in the "devoirs_choice" statement, FALSE otherwise]])
Q(inline = [[the inline field from the original MCQ chunk]])
```

8. Although `devoirs3::devoirs_start()` is needed for a complete {devoirs3} document, most of the .qmd files to be translated have a "{{< include ../exercise-header.qmd >}}" line which handles this aspect of the compilation from qmd to html.


## Phase 1 contraints

1. Do not modify any of the existing .qmd files. Instead, create new files in the devoirs3/ directory that parallel the file system format of existing .qmd files.
2. Any content in the original qmd files, except for the "mcq" chunks, should be passed verbatim, byte-by-byte into the output.
3. Running the converter on any input file *without* "mcq" chunks should produce a simple copy of the original file.
4. Defer the conversion of `devoirs::devoirs_set()` into the "devoirs_choices" format until phase 2. 
 
## Phase 2

The object of this phase is to create another translation R function that will handle the existing calls to `devoirs::devoirs_set()`. I should look like this: 

1. Replace calls to `devoirs_set()` with calls to `devoirs_set3()`. The arguments will remain the same.
2. `devoirs_set3()` will internally create an R object of the sort emitted by "devoirs_choices" chunks, then internally call `devoirs3::devoirs_selection()` on that object, setting the "id=" argument from `devoirs_set()` to be the question element label that is given as input to `devoirs3::devoirs_selection()`, and similarly with the "inline=" argument value. Note that in `devoirs_set()` the `choices=` argument mostly contains distractors, although the correct answer may or may not be included. The `correct=" argument identifies choices that are correct, adding these to the overall set of choice items. The `sort =` argument to `devoirs_set()` controls whether the choice items will be placed in random order or if they should be sorted alphabetically or numerically. The `n =` argument sets the number of total number of choices that will appear in the result, counting both distractors and "correct=" items. 
    - Do not emit a "devoirs_choices" chunk. The only emission should be that from `devoirs3::devoirs_selection()`. The `answers=` argument to `devoirs3::devoirs_selection() will be created internally from the choices and answers given in the arguments to `devoirs_set()`. 
    - The `inline =` argument to `devoirs_selection()` will be taken directly from the corresponding input to `devoirs_set()`
    - The translation of "devoirs::devoirs_set([[arguments]])" will be literally "devoirs_set3([[arguments]])".
    - New behavior for the `n=` argument. The current `devoirs::devoirs_set()` samples down to n only when length(choices) > n, then inserts correct by replacing a choice if it isn’t already present. In `devoirs_set3()`, the `correct=` argument may be a vector, in which case *all* the elements of the vector should be added to the sample of size n from `choices`. So the upper bound is `n + length(correct)`.
    - If `sort=` is not specified, the items should be sorted only if they are numeric. If `sort=` is specified, its setting determines entirely whether sorting is performed, even if the items are not numeric.
    - Any surrounding material should remain unaltered. For instance, the translation of an inline chunk ```r devoirs::devoirs_set([[arguments]])``` will be the same inline chunk container. Sometimes that inline chunk container is preceded or followed by markdown text, for instance "Part c. [[inline chunk]]" Retain that preceding or following markdown text verbatim.
    - If the `devoirs::devoirs_set()` call is contained in an non-inline R chunk, simply replace it with `devoirs_set3()`.
    - Later, I will add `devoirs_set3()` to the {devoirs3} package, but for the present simply define the function `devoirs_set3()` in the translations.R file.
    - If a call to `devoirs::devoirs_set()` does not have an explicit value for `id=`, generate a random hash of five characters, such as "62ef8" and then explicitly list it as the stable first argument to `devoirs_set3()`, for example, `devoirs_set3(label="62ef8", [[other arguments]]). In other words, the value of the generated hash code is explicit in the output of the translation.
    - Since `devoirs3::devoirs_selection()` returns a render function, the operation of `devoirs_set3()` will need to return the results from an invocation of the function created by `devoirs3::devoirs_selection()` with appropriate `inline=` argument.
    - Only actual `devoirs::devoirs_set(...)` calls are rewritten, while preserving their argument expressions and surrounding markdown or R code. The only exception is when the `id =` argument to `devoirs::devoirs_set()` has not been specified, in which case, as described above, add in a `label=` argument with a literal character string value.

## Phase 2 work plan

1. Write the `devoirs_set3()` function, adding it to the `translations.R` file. `devoirs_set3()` will take the same argument list as `devoirs::devoirs_set()` with one exception: the `id=` argument to `devoirs::devoirs_set()` will be replaced with a `label=` argument in `devoirs_set3()`. (complete)


2. Manually test out `devoirs_set3()` in the devoirs_choices.qmd file, compiling it to HTML and observing whether the behavior is as desired. (complete)

3. Add `devoirs_set3()` to the {devoirs3} package, removing the definition from translations.R. (complete)

4. Write another function, `set_to_set3()` that will, like `mcq_to_devoirs_choices()` take character string lines as input and produce character string lines as output. The definition of the function should be in translations.R. The only changes will be that the literal `devoirs::devoirs_set` will be replaced by `devoirs3::devoirs_set3` and any `id=` argument replaced with a `label=` argument.  I will use `set_to_set3()` in a pipeline with `mcq_to_devoirs_choices()` to render a more complete translation of the original "mcq" qmd files. (complete)

## Phase 3

In this phase of the project, we will arrange to translate the qmd files written using the {devoirs} into qmd files that use {devoirs3}.

1. The source files for the translation will be in sub-directories of the project root, for instance, Chap-01/ .
2. The translation will be file by file, so that each source file will be translated into a new qmd file. The new qmd file should be placed in the devoirs3/ directory, using the name of the subdirectory of the source file. For instance, Chap-01/ant-catch-roof.qmd will be translated into devoirs3/Chap-01/ant-catch-roof.qmd.
3. Ultimately, the translated files will be used instead of the original source files. 

## Phase 3 work plan

1. There are already functions `mcq_to_devoirs_choices()` and `set_to_set3()`, with sources in translations.R, that translate the "mcq" style to the new "devoirs_choices" style and that replace `devoirs::devoirs_set()` with a corresponding call to `devoirs3::devoirs_set3()`. (complete)

2. Create an R function, `translate_one_file()`, placing the source in translations.R, takes a path name of the form `"Chap-04/aspen-let-shelf.qmd"` that reads in the lines of "Chap-04/aspen-let-shelf.qmd", piping them through `mcq_to_devoirs_choices()` and `set_to_set3()` to produce a translated set of lines. These lines should then be written to a file of the same path form but pre-pended with "devoirs3/". (completed)
    - That is, the input to `translate_one_file()` will become the path name for the output from the translation pipeline. Example, the input path name `"Chap-04/aspen-let-shelf.qmd"` will result in a new file stored in `devoirs3/Chap-04/aspen-let-shelf.qmd` that contains the translated lines.
    - If a needed output directory, for instance `devoirs3/Chap-17/` does not exist, create it. 
    - The file created as output preserves the source file's relative path, but under the directory "devoirs3/".
    - Do NOT delete any source files. The only changes to the filesystem will be the creation of new files and directories under `devoirs3` and, if a second pass of translation is called for by the author, overwriting the corresponding files in `devoirs3/`.
    - The translated file should preserve the textual content outside converted regions.
    - The `set_to_set3()` translation function sometimes generate new, random IDs for the question elements. These do not need to be preserved from one run to another. That is, if the translation is called for on two different occasions, the target file may have different question element IDs, but only for those generated randomly by the translation.


3. Write another function, `translate_chapter()`, whose argument is a chapter directory name, e.g. "Chap-17", and which applies `translate_one_file()` to all of the .qmd files in "Chap-17/", creating a corresponding set of files in the target directory `devoirs3/Chap-17/". (complete)
    - Use recursive file discovery with the specified directory. For instance, subdirectories of "Chap-17" should be searched and translation made, putting the result in a parallel directory structure under "devoirs3/Chap-17".
    - If that target directory does not exist, create it. 
    - All files in the source directory should be translated, even if the translation is a no-op, that is, the target file is byte-for-byte the same as the source file.
    - If translation fails for a source file, create a copy of the source file in the target directory. The author will identify such files manually.

4. The author will run test compilations to identify glitches in translation. The author will provide feedback to the AI in subsequent instructions to resolve the translation process to avoid such glitches. 

## Translation updates, Nov. 5

Initial experience with `translate_chapter()` found some glitches.

1. Calls to `devoirs::devoirs_text()` need to be re-written using `devoirs3::devoirs_text()`.

    - "rows" in devoirs needs to be "height" in the devoirs3 version.
    - similarly, "cols" in devoirs needs to be "width" in devoirs3.
    - If the name of the `qid=` argument in devoirs is used in a call, the devoirs3 argument name of `label=` should be substituted. 
    - The "str=" argument in devoirs needs to become "placeholder=" in devoirs3

2. The arguments in devoirs3::devoirs_TF() differ slightly from devoirs::devoirs_TF.
    - "id=" becomes "label="
    - "wrong.hint=" becomes "wrong_hint="
    - similarly, "right.hint=" becomes "right_hint=".

3. Examples of forms that will be passed through the filter unchanged:
    - Name reference: "I like `devoirs_text()` very much."
    - No-arg call: "I will not usually call `r devoirs_TF()` without arguments."

4. Calls to `devoirs_TF()` with arguments specified should all be translated, whether they be in inline chunks, multiline chunks, or as literal text. 

### Nov 5 work plan

1. Write an R translation filter, to be called `Nov5(Lines)`, along the lines of `set_to_set3()` that will translate {devoirs} calls for `devoirs_text()` or `devoirs_TF()` into the corresponding {devoirs3} calls.
    - Put the source code in translations.R
    - Nov5() takes a character string vector in and produces the translated character string vector as output.
    - Only lines containing `devoirs_text()` or `devoirs_TF()` will be altered. All other lines will be passed through the filter without change.
    - Both package-qualified forms like `devoirs::devoirs_TF()` and unqualified forms like `devoirs_TF()` should be translated to qualified forms such as `devoirs3::devoirs_TF()`.
    - Positional arguments are unchanged in the translation. Named arguments, such as `qid=` should be translated into named arguments with the devoirs3 form, e.g. `qid=` becomes `label=`.

2. Modify the `translate_one_file()` function in translations.R to add `Nov5()` to the pipeline chain. I anticipate that `translate_chapter()` will not need any alterations, since it calls `translate_one_file()` to do the work. 

The subdirectory "_exercises" contains many files, each of which is intended to hold:

- a drill question or a small set of drill questions
- an exercise, which is a longer form often instrumented with {mcq} blocks or other `{devoirs}` functions for writing essays or making a choice.
- a discussion topic, suited to be used in class to elaborate on a topic from the book
- an activity, which might be used in the classroom as a small-group collaboration among students and which, like a discussion topic elaborates on a topic from the book, but is usually about developing a specific skill, such as using `slice_plot()` to graph a function.

In general, the files in "_exercises" have three part names, for instance "ant-become-window.qmd".

Many also have some YAML front matter, with fields like 

- id, a unique ID, generally related to the file name
- created, the date originally created 
- attribution, the name or initials of the author. If currently marked "TBA", attribute to "DTK"

Some files have a "use" attribute in the YAML, which consists of short notes to myself about how and where the contents would be used in a course.

I would like to add to the files three new YAML fields:

- status, one of these three possibilities:
    - Sketch: Only YAML headers; content is fragmented pseudocode or outline; no correct answers identified.
    - In-progress: Full content present but multiple-choice options incomplete, no marked answer, or explanation missing.
    - Ready: All required fields filled; correct answers marked; explanations provided; no "TBA" or "TODO" notes.
- chapter, the earliest chapter by which all the skills needed for the exercise or activity have been introduced in the book chapters.
- mode, whether the contents of the file most strongly correspond to a drill problem, an exercise, a discussion, an instructor presentation, or an activity. The following table outlines the distinctions.

The existing Exer-NN-.qmd files give names of exercises currently identified as related to chapter NN. But verify by searching for key concepts in Chap-NN files. If an exercise requires 'rates of change' or 'derivatives,' map it to the chapter where that concept is formally introduced (not just mentioned).


Mode	| Length | Format | Learning Goal | Example
--------|--------|--------|---------|------
Drill | 1–3 questions | MCQ or fill-in | Quick knowledge check | "What is acceleration's dimension?"
Exercise | ~5+ parts | Essays, code, calculations | Deeper problem-solving | "Analyze motion data; calculate acceleration at each time interval"
Discussion | Prompt + context | Open-ended | Class engagement & interpretation | "Discuss: Why do seatbelts prevent injury? (hint: acceleration)"
Presentation | Multi-part | Open-ended | Material best presented interactively by the instructor | "How to plot functions in R."
Activity | Multi-part, collaborative | Code/plotting/group work | Skill development | "Use R to plot velocity vs. time, then estimate acceleration"
Reading Question | A single essay or a handful of questions | Mostly essays | Force the reader to review the chapter | "Explain how input/out scaling contributes to the construction of a function for modeling."

- mode2, for files that fit well into two different nodes, name the second node here.

To start, I want to look at file _exercises/ant-tell-saw.qmd as a test case. Answer these questions:

- Can you identify a corresponding chapter?  Note that the files named "Exer-NN-*.qmd" contain a list of exercise files already identifies with chapter NN.
- Can you identify the current status?
- Can you classify it into one of the modes?


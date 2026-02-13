;; -*- lexical-binding: t; -*-

(TeX-add-style-hook
 "main"
 (lambda ()
   (TeX-add-to-alist 'LaTeX-provided-class-options
                     '(("report" "")))
   (TeX-add-to-alist 'LaTeX-provided-package-options
                     '(("inputenc" "utf8") ("geometry" "a4paper") ("hyperref" "") ("acronym" "") ("graphicx" "") ("minted" "") ("listings" "") ("caption" "") ("subcaption" "") ("todonotes" "") ("csquotes" "") ("biblatex" "backend=biber" "style=authoryear-icomp" "sortlocale=de_DE" "natbib=true" "url=false" "doi=true" "eprint=false" "style=numeric")))
   (add-to-list 'LaTeX-verbatim-environments-local "lstlisting")
   (add-to-list 'LaTeX-verbatim-environments-local "minted")
   (add-to-list 'LaTeX-verbatim-environments-local "VerbatimWrite")
   (add-to-list 'LaTeX-verbatim-environments-local "VerbEnv")
   (add-to-list 'LaTeX-verbatim-environments-local "SaveVerbatim")
   (add-to-list 'LaTeX-verbatim-environments-local "VerbatimOut")
   (add-to-list 'LaTeX-verbatim-environments-local "LVerbatim*")
   (add-to-list 'LaTeX-verbatim-environments-local "LVerbatim")
   (add-to-list 'LaTeX-verbatim-environments-local "BVerbatim*")
   (add-to-list 'LaTeX-verbatim-environments-local "BVerbatim")
   (add-to-list 'LaTeX-verbatim-environments-local "Verbatim*")
   (add-to-list 'LaTeX-verbatim-environments-local "Verbatim")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "lstinline")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "href")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperimage")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperbaseurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "nolinkurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "url")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "path")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "Verb")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "Verb*")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "EscVerb")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "EscVerb*")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "lstinline")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "Verb*")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "Verb")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "path")
   (TeX-run-style-hooks
    "latex2e"
    "report"
    "rep10"
    "inputenc"
    "geometry"
    "hyperref"
    "acronym"
    "graphicx"
    "minted"
    "listings"
    "caption"
    "subcaption"
    "todonotes"
    "csquotes"
    "biblatex")
   (LaTeX-add-labels
    "sec:introduction-bridging-the-gap"
    "sec:motivation"
    "sec:block-based-programming"
    "sec:frames"
    "sec:levels"
    "fig:test"
    "lst:bool-grammar-true-false"
    "lst:bool-grammar-var"
    "lst:bool-grammar-neg"
    "sec:validation-sequence-allowed"
    "sec:possibility-separating-visualisation-from-structure"
    "sec:visualisation-in-lines"
    "sec:generated-via-runtime"
    "sec:interacting-holes-filter"
    "sec:mutating-the-tree-drag-drop-operations"
    "sec:limiting-holes-based-on-grammar"
    "sec:move-copy"
    "sec:embrace"
    "sec:changing-types"
    "sec:working-with-sequences"
    "sec:why-the-ebnf-does-not-suffice"
    "sec:possibility-custom-code-generation"
    "sec:prettyprinting-the-prettier-backend"
    "sec:meta-grammar"
    "sec:json-representation-irrelevant-because-of-tool"
    "sec:sql"
    "sec:javascript"
    "sec:conclusion"
    "sec:no-need-for-levels")
   (LaTeX-add-bibliographies
    "forreal"))
 :latex)


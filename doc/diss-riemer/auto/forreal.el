;; -*- lexical-binding: t; -*-

(TeX-add-style-hook
 "forreal"
 (lambda ()
   (LaTeX-add-bibitems
    "clark_relax_2001"
    "fraser_ten_2015"
    "kolling_frame-based_2015"))
 '(or :bibtex :latex))


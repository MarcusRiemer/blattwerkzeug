# Minimal makefile for Sphinx documentation

# You can set these variables from the command line.
SPHINXOPTS    =
SPHINXBUILD   = sphinx-build
SPHINXPROJ    = BlattWerkzeug
SOURCEDIR     = .
BUILDDIR      = _build

# Paths to internal tools
MAKE_CLIENT = make --no-print-directory -C ../../client
CLI_PROG_CLIENT = ../../client/dist/cli/main.cli.js

# Put help first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

install-deps:
	pip install --user -r requirements.txt

# Generating pretty printed grammar files
generated/%.grammar: $(CLI_PROG_CLIENT)
	@mkdir -p generated
	@echo '{ "type": "printGrammar", "programmingLanguageId": "$*" }' | node $(CLI_PROG_CLIENT) | jq -r . | tee "generated/$*.grammar"

generated/%.blocks: $(CLI_PROG_CLIENT)
	@mkdir -p generated
	@echo '{ "type": "printBlockLanguage", "blockLanguageId": "$*" }' | node $(CLI_PROG_CLIENT) | jq -r . | tee "generated/$*.blocks"

generated/%.sql: examples/syntaxtree/%.json $(CLI_PROG_CLIENT)
	@mkdir -p generated
	@echo '{ "type": "emitTree", "model": $(shell cat "$<" | jq -c .), "languageId": "sql"}' | node $(CLI_PROG_CLIENT) | jq -r . | tee "generated/$*.sql"

generated/%.graphviz: examples/syntaxtree/%.json $(CLI_PROG_CLIENT)
	@mkdir -p generated
	@echo '{ "type": "graphvizTree", "model": $(shell cat "$<" | jq -c .)}' | node $(CLI_PROG_CLIENT) | jq -r . | tee "generated/$*.graphviz"

generated/%.svg: generated/%.graphviz
	@mkdir -p generated
	dot -Tsvg -o $@ $^

generated/%.emf: generated/%.svg
	inkscape $^ --export-filename $@

# Default set of pretty printed grammar files
pretty-grammars: generated/sql.grammar generated/dxml.grammar generated/regex.grammar generated/css.grammar generated/json.grammar generated/trucklino-program.grammar

# Default set of pretty printed blocks
pretty-blocks: generated/sql.blocks

# Default set of graphviz trees
graphviz-trees: generated/ast-example-if.graphviz generated/ast-example-if-no-pred.graphviz generated/ast-example-null.graphviz generated/ast-example-expr-variable.graphviz generated/ast-example-expr-binary.graphviz generated/ast-sql-column-name.graphviz generated/ast-example-xml-node-two-attributes.graphviz generated/ast-trucklino-wait-traffic-light.graphviz generated/ast-xml-root.graphviz

# Re-generate everything that can be created dynamically
all-generated: pretty-grammars pretty-blocks graphviz-trees

clean:
	rm -rf generated _build

livehtml:
	sphinx-autobuild -b html "$(SOURCEDIR)" "$(BUILDDIR)/html" $(SPHINXOPTS)

html: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

latexpdf: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile livehtml pretty-grammars pretty-blocks clean

CLI_PROG_CLIENT = ../../client/dist/cli/main.cli.js

SYNTAXTREES_IN = $(wildcard syntaxtrees/*.json)
SYNTAXTREES_PDF = $(subst .json,.pdf,$(SYNTAXTREES_IN))

all : $(SYNTAXTREES_PDF)

clean :
	rm -f $(SYNTAXTREES_PDF)

syntaxtrees/%.graphviz: syntaxtrees/%.json $(CLI_PROG_CLIENT)
	echo '{ "type": "graphvizTree", "model": $(shell cat "$<" | jq -c .)}' | node $(CLI_PROG_CLIENT) | jq -r . > syntaxtrees/$*.graphviz

syntaxtrees/%.svg: syntaxtrees/%.graphviz
	dot -Tsvg -o $@ $^

syntaxtrees/%.emf: syntaxtrees/%.svg
	inkscape $^ --export-filename $@

syntaxtrees/%.pdf: syntaxtrees/%.svg
	inkscape $^ --export-filename $@

# This makefile does not much work itself, but it routes the available targets
# to the specific targets for server, client or whatever. If you want to e.g.
# ONLY install dependencies for the client, change to the `client` folder
# first and call `install-deps` there.

# All really does *everything* and will usually not be the target you want to
# call. "Everything" especially includes the whole documentation which doesn't
# need to be generated if you "only" intend to run esqulino.
all : install-deps dist doc

# Remove everything that could be re-generated by a Makefile
clean : clean-deps clean-dist clean-doc

# All those "entering directory" messages are usually just visual clutter,
# but in case something path-related goes horribly wrong during compilation
# this is the escape hatch to easily add the messages back in.
SUBDIR_MAKE = @make --no-print-directory -C

# Installs libraries this project depends on. For this to actually work,
# you will need to have npm (for the client) and bundle (for the server)
# installed.
install-deps :
	$(SUBDIR_MAKE) server install-deps
	$(SUBDIR_MAKE) client install-deps
	$(SUBDIR_MAKE) dist install-deps
	$(SUBDIR_MAKE) schema/json install-deps

# Attempts to remove libraries or utilities that have been dowloaded.
# This will not touch any globally installed gems, but merely delete
# folders that contain these dependencies.
clean-deps :
	$(SUBDIR_MAKE) client clean-deps
	$(SUBDIR_MAKE) dist clean-deps
	$(SUBDIR_MAKE) schema/json clean-deps

# One-shot compilation of all things that are required to run esqulino.
# Once these are in place, the client archives are packaged up,
# ready to be distributed.
dist :
	$(SUBDIR_MAKE) client all
	$(SUBDIR_MAKE) dist archive-use

# Removing everything that is required to run esqulino
clean-dist :
	$(SUBDIR_MAKE) dist clean

# One-shot compilation of all things that are required to run esqulino
dist-dev :
	$(SUBDIR_MAKE) client all
	$(SUBDIR_MAKE) dist all
	$(SUBDIR_MAKE) schema/json all

# Reverts the test project to the most recent state in git
test-reset: msg-pre-test-reset
	git checkout -- $(shell git rev-parse --show-toplevel)/data/dev/projects/test
	cd $(shell git rev-parse --show-toplevel)/data/dev/projects/test && git clean -f

# Runs end to end tests. This relies on two other servers that must be
# running already:
# * The esqulino webserver
# * The Selenium testdriver
test-e2e : dist
	$(SUBDIR_MAKE) client test-e2e

# Runs the server. Although this target will also serve static files, it is
# strongly encouraged to run a more sophisticated server for static files
# as a reverse proxy.
server-run :
	$(SUBDIR_MAKE) server run

# Runs a development version of the server. This server will restart itself if
# relevant files change and emit additional debug output. NOT RECOMMENDED for
# productive use.
server-run-dev :
	$(SUBDIR_MAKE) server run-dev

# Attempts to migrate all projects to a newer API version
server-migrate-projects:
	$(SUBDIR_MAKE) server migrate-projects


# Compile every part of the documentation, including the thesis.
doc :
	$(SUBDIR_MAKE) server doc
	$(SUBDIR_MAKE) doc/thesis all
	$(SUBDIR_MAKE) doc/swagger all

# Remove every bit of generated documentation
clean-doc:
	$(SUBDIR_MAKE) server doc-clean
	$(SUBDIR_MAKE) doc/thesis clean
	$(SUBDIR_MAKE) doc/swagger clean

##################################
# Development targets
##################################

# Used during development: Prettyprints all available JSON Files, the use of
# sponge is basically a substitute for "jq . < {} > {}" (in place editing of
# the same file).
# BEWARE: If any of the input files is not syntactically valid JSON (this
# *includes* quoted keys) the output file will be empty.
dev-pretty-json-data :
	find data -iname "*.json" -exec bash -c 'jq . < {} | sponge {}' \;

# Prettyprints template data, but beware: Tidy does not mix well with the
# liquid syntax, so this might destroy something ...
dev-pretty-html-data :
	find data/dev/projects -iname "*.liquid" -exec tidy -config tidy-config.txt -o {} {} \;

# Used during development: Strips all trailing whitespace from "own"
# sourcefiles.
dev-delete-trailing-whitespace :
	find client/app \( -name '*.ts' -o -name '*.html' -o -name '*.scss' \) -exec sed --in-place 's/[[^:space]]\+[[:space:]]\+$$//' {} \+
	find server -type f \( -name '*.rb' \) -exec sed --in-place 's/[[^:space]]\+[[:space:]]\+$$//' {} \+

##################################
# Message targets
##################################

msg-pre-test-reset :
	@tput setaf 2; echo "## Test   : Resetting test project"; tput sgr0

.PHONY : all clean dev-delete-trailing-whitespace dev-pretty-json-data doc install-deps server-run dist

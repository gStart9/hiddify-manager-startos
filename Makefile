ARCHES := x86 arm
# overrides to s9pk.mk must precede the include statement
include node_modules/@start9labs/start-sdk/s9pk.mk

# The image's build context is not among the ingredients that start-cli lists.
$(BASE_NAME).s9pk $(BASE_NAME)_x86_64.s9pk $(BASE_NAME)_aarch64.s9pk: $(wildcard docker/*)

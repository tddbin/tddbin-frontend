
# not working yet, but close :)

# let
#   pkgs = import <nixpkgs> {};
#   stdenv = pkgs.stdenv;
# in rec {
#   nodejs = stdenv.mkDerivation rec {
#     name = "tddbin-frontend-environment";
#     version = "7.10.0";
#     src = pkgs.fetchurl {
#       url = "https://nodejs.org/download/release/v${version}/node-v${version}.tar.xz";
#       sha256 = "08czj7ssvzgv13zvhg2y9mhy4cc6pvm4bcp7rbzj3a2ba8axsd6w";
#     };
#
#     preConfigure = stdenv.lib.optionalString stdenv.isDarwin ''export PATH=/usr/bin:/usr/sbin:$PATH'';
#       buildInputs = [ pkgs.python ] ++ stdenv.lib.optional stdenv.isLinux pkgs.utillinux;
#     };
#
#     shellHook = ''
#       ${nodejs}/bin/npm i --no-optional
#     '';
# }
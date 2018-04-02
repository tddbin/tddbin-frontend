with import (fetchTarball https://github.com/nixos/nixpkgs/tarball/e401af5f980f38d72e130a75ee55c3d01a627996) { };

stdenv.mkDerivation {
    name = "dev-shell";
    src = null;
    buildInputs = [ nodejs-9_x ];
}

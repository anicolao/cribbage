{
  description = "Cribbage development and Firebase emulator environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
    in {
      devShells = nixpkgs.lib.genAttrs systems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          # Keep the runtime identical to CI; newer Bun releases can change
          # Firebase stream behaviour even with the same JS dependencies.
          bunSources = {
            aarch64-darwin = { archive = "bun-darwin-aarch64"; hash = "sha256-ggNOh8nZtDmOphmu4u7V0qaMgVfppq4tEFLYTVM8zY0="; };
            x86_64-darwin = { archive = "bun-darwin-x64-baseline"; hash = "sha256-+WhsTk52DbTN53oPH60F5VJki5ycv6T3/Jp+wmufMmc="; };
            aarch64-linux = { archive = "bun-linux-aarch64"; hash = "sha256-+l7LJcr6jo9ch6D4M3GdRt0K8KhseDfYBlMSEtVWNtM="; };
            x86_64-linux = { archive = "bun-linux-x64"; hash = "sha256-9XvAGH45Yj3nFro6OJ/aVIay175xMamAulTce3M9Lgg="; };
          };
          source = bunSources.${system};
          bun = pkgs.bun.overrideAttrs {
            version = "1.3.10";
            src = pkgs.fetchurl {
              url = "https://github.com/oven-sh/bun/releases/download/bun-v1.3.10/${source.archive}.zip";
              inherit (source) hash;
            };
          };
        in {
          default = pkgs.mkShell {
            packages = [ bun ] ++ (with pkgs; [ nodejs_24 jdk21 git gh ripgrep ]);
            JAVA_HOME = pkgs.jdk21.home;
          };
        });
    };
}

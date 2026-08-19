{
  description = "Auction App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            python3
            nodejs_24
          ];
          
          shellHook = ''
            echo "Auction App"
            echo "Python: $(python --version)"
            echo "Node: $(node --version)"
            
            # Set up a local Python virtual environment if it doesn't exist
            if [ ! -d ".venv" ]; then
              echo "Creating virtual environment..."
              python -m venv .venv
            fi
            
            # Activate the virtual environment
            source .venv/bin/activate
            
            # Automatically install backend dependencies
            if [ -f "server/python/requirements.txt" ]; then
              echo "Installing Python dependencies..."
              pip install -r server/python/requirements.txt
            fi
          '';
        };
      }
    );
}
use std::fs;
use std::path::Path;
use std::io;
use std::fs::DirEntry;

fn copy_dir_all(src: &Path, dst: &Path) -> io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let dest_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), dest_path)?;
        }
    }
    Ok(())
}

fn main() {
    // Ensure Cargo rebuilds if build.rs changes
    println!("cargo:rerun-if-changed=build.rs");

    // let src = Path::new("../dataflow-generator");
    // let dst = Path::new("src-tauri/resources/dataflow-generator");
    // if src.exists() {
    //     copy_dir_all(src, dst).expect("Failed to copy dataflow-generator");
    // }
    tauri_build::build()
}

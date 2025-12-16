# ER Diagram Feature

## Overview
The ER Diagram feature provides an interactive visualization of your database schema, showing tables and their foreign key relationships in a graphical format.

## Features

### 🎨 **Visual Representation**
- **Table Nodes**: Each table is displayed as a card showing:
  - Table name and schema
  - Columns involved in foreign key relationships
  - Primary key indicators (🔑 icon)
  - Foreign key badges (FK)
  
### 🔗 **Relationship Visualization**
- **Animated Edges**: Foreign key relationships shown as animated arrows
- **Edge Labels**: Display column mappings (e.g., `user_id → id`)
- **Color-Coded**: Accent color for easy identification

### 📐 **Layout Options**
- **Smart Layout**: Tables arranged in a circular pattern based on connection count
  - Most connected tables placed in the center
  - Related tables positioned nearby
- **Grid Layout**: Simple grid arrangement for predictable positioning

### 🎮 **Interactive Controls**
- **Zoom & Pan**: Navigate large schemas easily
- **MiniMap**: Overview of entire diagram
- **Click to Navigate**: Click any table to open it
- **Drag & Drop**: Reposition tables manually

### ⌨️ **Keyboard Shortcuts**
- `L` - Toggle between Smart and Grid layouts
- Mouse wheel - Zoom in/out
- Click + Drag - Pan around the diagram

## Usage

### Opening ER Diagram
1. Navigate to the schema tree in the left sidebar
2. Right-click on any schema
3. Select **"View ER Diagram"**

### Navigation
- **Click a table node** to open that table in a new tab
- **Drag nodes** to rearrange the layout
- **Use zoom controls** in the bottom-right corner
- **Toggle layouts** using the toolbar or `L` key

### Understanding the Diagram

#### Table Nodes
```
┌─────────────────────┐
│ 🗄️ users            │ ← Table name
│ public              │ ← Schema
├─────────────────────┤
│ 🔑 id               │ ← Primary key
│ email               │
│ created_at          │
├─────────────────────┤
│ 3 columns           │ ← Column count
└─────────────────────┘
```

#### Relationship Arrows
```
orders ──user_id → id──> users
       └─ FK column  └─ Referenced column
```

### Stats Display
The top-right corner shows:
- **Tables**: Total number of tables in the schema
- **Relations**: Total number of foreign key relationships

## Performance

### Optimization
- Efficient rendering for schemas with 50+ tables
- Lazy loading of column details
- Optimized layout calculations

### Best Practices
- For very large schemas (100+ tables), consider:
  - Using Grid layout for faster rendering
  - Filtering tables by prefix/category
  - Viewing specific subsections separately

## Technical Details

### Data Source
- Foreign keys fetched from `information_schema`
- Real-time data from your database
- Supports database override for multi-database connections

### Supported Databases
- ✅ PostgreSQL (fully supported)
- ⏳ MySQL (planned)
- ⏳ SQLite (planned)

### Libraries Used
- **ReactFlow**: Diagram rendering and interactions
- **React Query**: Data fetching and caching
- **Lucide Icons**: UI icons

## Troubleshooting

### No Relationships Shown
- Ensure your tables have foreign key constraints defined
- Check that you're viewing the correct schema
- Verify database permissions

### Performance Issues
- Switch to Grid layout for faster rendering
- Close other heavy tabs
- Consider viewing smaller schema sections

### Tables Not Clickable
- Ensure you have permissions to view table data
- Check that the table exists in the current database context

## Future Enhancements

Planned features:
- [ ] Export diagram as PNG/SVG
- [ ] Show all columns (not just FK-related)
- [ ] Filter tables by name/prefix
- [ ] Highlight table and its relationships on hover
- [ ] Show indexes and constraints
- [ ] Compare schemas visually
- [ ] Generate migration scripts from diagram

## Feedback

Found a bug or have a feature request? Please open an issue on GitHub!

export const translations = {
    en: {
        // Modal Header
        title: 'Visual Query Builder',
        subtitle: 'Build powerful SQL queries without writing code',
        help: 'Help',
        close: 'Close',
        applyClose: 'Apply & Close',

        // Tooltips
        tooltips: {
            distinct: 'Remove duplicate rows from results',
            groupBy: 'Group rows that have the same values in specified columns',
            having: 'Filter groups (use after GROUP BY)',
            aggregate: 'Calculate values like COUNT, SUM, AVG across rows',
            join: 'Combine data from multiple tables',
            offset: 'Skip first N rows (useful for pagination)',
        },

        // Sections
        sections: {
            schema: 'Schema',
            table: 'Table',
            selectColumns: 'Select Columns',
            calculateValues: 'Calculate Values (AGGREGATE)',
            joinTables: 'Join Tables (JOIN)',
            filterRows: 'Filter Rows (WHERE)',
            groupRowsBy: 'Group Rows By (GROUP BY)',
            filterGroups: 'Filter Groups (HAVING)',
            sortResults: 'Sort Results (ORDER BY)',
            pagination: 'Pagination (LIMIT/OFFSET)',
        },

        // Actions
        actions: {
            add: 'Add',
            remove: 'Remove',
            selectSchema: 'Select schema...',
            selectTable: 'Select a table...',
            allColumns: 'All Columns (*)',
            removeDuplicates: 'Remove Duplicates',
        },

        // Empty States
        emptyStates: {
            noCalculations: 'No calculations added yet',
            noJoins: 'No joins added yet',
            noFilters: 'No filters added yet',
            noHavingFilters: 'No HAVING filters added yet',
            noSorting: 'No sorting added yet',
        },

        // Form Labels
        labels: {
            limitMaxRows: 'Limit (max rows)',
            offsetSkipRows: 'Offset (skip rows)',
            resultName: 'Result name',
            value: 'Value',
            value2: 'Value 2',
        },

        // Operators
        operators: {
            equals: 'equals',
            greater: 'greater',
            less: 'less',
            greaterOrEqual: 'greater or equal',
            lessOrEqual: 'less or equal',
            notEqual: 'not equal',
            like: 'pattern',
            ilike: 'case-insensitive',
            in: 'in list',
            notIn: 'not in list',
            isNull: 'IS NULL',
            isNotNull: 'IS NOT NULL',
            between: 'range',
        },

        // Logic Operators
        logic: {
            and: 'AND',
            or: 'OR',
        },

        // Sort Directions
        sort: {
            ascending: 'A → Z (ASC)',
            descending: 'Z → A (DESC)',
        },

        // Join Types
        joins: {
            inner: 'INNER JOIN',
            left: 'LEFT JOIN',
            right: 'RIGHT JOIN',
            full: 'FULL JOIN',
        },

        // Aggregate Functions
        aggregates: {
            count: 'Count (COUNT)',
            countDistinct: 'Count Distinct (COUNT DISTINCT)',
            sum: 'Sum (SUM)',
            avg: 'Average (AVG)',
            min: 'Minimum (MIN)',
            max: 'Maximum (MAX)',
        },

        // Keyboard Shortcuts
        shortcuts: {
            escToClose: 'to close',
            runQuery: 'to run query',
        },

        // Guide Panel
        guide: {
            title: 'Quick Start Guide',
            subtitle: 'Learn how to build queries visually',
            tabs: {
                steps: 'Step-by-Step Guide',
                examples: 'Common Examples',
            },
            proTips: {
                title: '💡 Pro Tips',
                tips: [
                    'Hover over <strong>?</strong> icons for detailed explanations',
                    'SQL is generated automatically as you build',
                    'Use GROUP BY with aggregate functions for summaries',
                    'HAVING filters work on grouped data, WHERE filters on rows',
                ],
            },
            steps: [
                {
                    title: '1. Select Your Data Source',
                    description: 'Start by choosing a schema and table from the dropdown menus at the top.',
                    example: 'Schema: public → Table: products',
                },
                {
                    title: '2. Choose Columns',
                    description: 'Select which columns you want to see in your results. Click "All (*)" to select everything.',
                    example: 'Select: name, price, category',
                },
                {
                    title: '3. Add Filters (Optional)',
                    description: 'Filter your data using WHERE conditions. Click "+ Add" to add multiple filters.',
                    example: 'price > 100 AND category = "Electronics"',
                },
                {
                    title: '4. Calculate Values (Optional)',
                    description: 'Use aggregate functions to calculate totals, averages, counts, etc.',
                    example: 'COUNT(id) as total_products, AVG(price) as avg_price',
                },
                {
                    title: '5. Group Data (Optional)',
                    description: 'Group rows by columns to see aggregated results.',
                    example: 'Group by: category',
                },
                {
                    title: '6. Sort Results (Optional)',
                    description: 'Order your results by one or more columns.',
                    example: 'Sort by: price (descending)',
                },
                {
                    title: '7. Set Limits',
                    description: 'Control how many rows to display and skip.',
                    example: 'Limit: 100, Offset: 0',
                },
            ],
            examples: [
                {
                    title: 'Find Expensive Products',
                    description: 'Get all products over $100',
                    steps: [
                        'Select table: products',
                        'Add filter: price > 100',
                        'Sort by: price (descending)',
                    ],
                },
                {
                    title: 'Count by Category',
                    description: 'See how many products in each category',
                    steps: [
                        'Select table: products',
                        'Add calculation: COUNT(*) as total',
                        'Group by: category',
                        'Sort by: total (descending)',
                    ],
                },
                {
                    title: 'Average Price Analysis',
                    description: 'Calculate average price per category',
                    steps: [
                        'Select table: products',
                        'Select columns: category',
                        'Add calculation: AVG(price) as avg_price',
                        'Group by: category',
                        'Add HAVING filter: avg_price > 50',
                    ],
                },
            ],
            cta: 'Got it, thanks!',
        },
    },

    vi: {
        // Modal Header
        title: 'Trình Tạo Truy Vấn Trực Quan',
        subtitle: 'Tạo truy vấn SQL mạnh mẽ mà không cần viết code',
        help: 'Trợ Giúp',
        close: 'Đóng',
        applyClose: 'Áp Dụng & Đóng',

        // Tooltips
        tooltips: {
            distinct: 'Loại bỏ các hàng trùng lặp khỏi kết quả',
            groupBy: 'Nhóm các hàng có cùng giá trị trong các cột được chỉ định',
            having: 'Lọc các nhóm (sử dụng sau GROUP BY)',
            aggregate: 'Tính toán các giá trị như COUNT, SUM, AVG trên các hàng',
            join: 'Kết hợp dữ liệu từ nhiều bảng',
            offset: 'Bỏ qua N hàng đầu tiên (hữu ích cho phân trang)',
        },

        // Sections
        sections: {
            schema: 'Schema',
            table: 'Bảng',
            selectColumns: 'Chọn Cột',
            calculateValues: 'Tính Toán Giá Trị (AGGREGATE)',
            joinTables: 'Kết Nối Bảng (JOIN)',
            filterRows: 'Lọc Hàng (WHERE)',
            groupRowsBy: 'Nhóm Hàng Theo (GROUP BY)',
            filterGroups: 'Lọc Nhóm (HAVING)',
            sortResults: 'Sắp Xếp Kết Quả (ORDER BY)',
            pagination: 'Phân Trang (LIMIT/OFFSET)',
        },

        // Actions
        actions: {
            add: 'Thêm',
            remove: 'Xóa',
            selectSchema: 'Chọn schema...',
            selectTable: 'Chọn bảng...',
            allColumns: 'Tất Cả Cột (*)',
            removeDuplicates: 'Loại Bỏ Trùng Lặp',
        },

        // Empty States
        emptyStates: {
            noCalculations: 'Chưa có phép tính nào',
            noJoins: 'Chưa có kết nối nào',
            noFilters: 'Chưa có bộ lọc nào',
            noHavingFilters: 'Chưa có bộ lọc HAVING nào',
            noSorting: 'Chưa có sắp xếp nào',
        },

        // Form Labels
        labels: {
            limitMaxRows: 'Giới hạn (số hàng tối đa)',
            offsetSkipRows: 'Bỏ qua (số hàng)',
            resultName: 'Tên kết quả',
            value: 'Giá trị',
            value2: 'Giá trị 2',
        },

        // Operators
        operators: {
            equals: 'bằng',
            greater: 'lớn hơn',
            less: 'nhỏ hơn',
            greaterOrEqual: 'lớn hơn hoặc bằng',
            lessOrEqual: 'nhỏ hơn hoặc bằng',
            notEqual: 'không bằng',
            like: 'mẫu',
            ilike: 'không phân biệt hoa thường',
            in: 'trong danh sách',
            notIn: 'không trong danh sách',
            isNull: 'NULL',
            isNotNull: 'KHÔNG NULL',
            between: 'trong khoảng',
        },

        // Logic Operators
        logic: {
            and: 'VÀ',
            or: 'HOẶC',
        },

        // Sort Directions
        sort: {
            ascending: 'A → Z (ASC)',
            descending: 'Z → A (DESC)',
        },

        // Join Types
        joins: {
            inner: 'Nối Trong (INNER JOIN)',
            left: 'Nối Trái (LEFT JOIN)',
            right: 'Nối Phải (RIGHT JOIN)',
            full: 'Nối Đầy Đủ (FULL JOIN)',
        },

        // Aggregate Functions
        aggregates: {
            count: 'Đếm (COUNT)',
            countDistinct: 'Đếm Riêng Biệt (COUNT DISTINCT)',
            sum: 'Tổng (SUM)',
            avg: 'Trung Bình (AVG)',
            min: 'Nhỏ Nhất (MIN)',
            max: 'Lớn Nhất (MAX)',
        },

        // Keyboard Shortcuts
        shortcuts: {
            escToClose: 'để đóng',
            runQuery: 'để chạy truy vấn',
        },

        // Guide Panel
        guide: {
            title: 'Hướng Dẫn Nhanh',
            subtitle: 'Học cách tạo truy vấn trực quan',
            tabs: {
                steps: 'Hướng Dẫn Từng Bước',
                examples: 'Ví Dụ Phổ Biến',
            },
            proTips: {
                title: '💡 Mẹo Chuyên Gia',
                tips: [
                    'Di chuột qua biểu tượng <strong>?</strong> để xem giải thích chi tiết',
                    'SQL được tạo tự động khi bạn thao tác',
                    'Sử dụng GROUP BY với các hàm tổng hợp để tóm tắt dữ liệu',
                    'Bộ lọc HAVING áp dụng cho dữ liệu đã nhóm, WHERE áp dụng cho từng hàng',
                ],
            },
            steps: [
                {
                    title: '1. Chọn Nguồn Dữ Liệu',
                    description: 'Bắt đầu bằng cách chọn schema và bảng từ các menu thả xuống ở trên cùng.',
                    example: 'Schema: public → Bảng: products',
                },
                {
                    title: '2. Chọn Cột',
                    description: 'Chọn các cột bạn muốn xem trong kết quả. Nhấp vào "Tất cả (*)" để chọn mọi thứ.',
                    example: 'Chọn: name, price, category',
                },
                {
                    title: '3. Thêm Bộ Lọc (Tùy Chọn)',
                    description: 'Lọc dữ liệu của bạn bằng các điều kiện WHERE. Nhấp vào "+ Thêm" để thêm nhiều bộ lọc.',
                    example: 'price > 100 VÀ category = "Electronics"',
                },
                {
                    title: '4. Tính Toán Giá Trị (Tùy Chọn)',
                    description: 'Sử dụng các hàm tổng hợp để tính tổng, trung bình, đếm, v.v.',
                    example: 'COUNT(id) là total_products, AVG(price) là avg_price',
                },
                {
                    title: '5. Nhóm Dữ Liệu (Tùy Chọn)',
                    description: 'Nhóm các hàng theo cột để xem kết quả tổng hợp.',
                    example: 'Nhóm theo: category',
                },
                {
                    title: '6. Sắp Xếp Kết Quả (Tùy Chọn)',
                    description: 'Sắp xếp kết quả của bạn theo một hoặc nhiều cột.',
                    example: 'Sắp xếp theo: price (giảm dần)',
                },
                {
                    title: '7. Đặt Giới Hạn',
                    description: 'Kiểm soát số lượng hàng hiển thị và bỏ qua.',
                    example: 'Giới hạn: 100, Bỏ qua: 0',
                },
            ],
            examples: [
                {
                    title: 'Tìm Sản Phẩm Đắt Tiền',
                    description: 'Lấy tất cả sản phẩm trên $100',
                    steps: [
                        'Chọn bảng: products',
                        'Thêm bộ lọc: price > 100',
                        'Sắp xếp theo: price (giảm dần)',
                    ],
                },
                {
                    title: 'Đếm Theo Danh Mục',
                    description: 'Xem có bao nhiêu sản phẩm trong mỗi danh mục',
                    steps: [
                        'Chọn bảng: products',
                        'Thêm tính toán: COUNT(*) là total',
                        'Nhóm theo: category',
                        'Sắp xếp theo: total (giảm dần)',
                    ],
                },
                {
                    title: 'Phân Tích Giá Trung Bình',
                    description: 'Tính giá trung bình cho mỗi danh mục',
                    steps: [
                        'Chọn bảng: products',
                        'Chọn cột: category',
                        'Thêm tính toán: AVG(price) là avg_price',
                        'Nhóm theo: category',
                        'Thêm bộ lọc HAVING: avg_price > 50',
                    ],
                },
            ],
            cta: 'Đã hiểu, cảm ơn!',
        },
    },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = typeof translations.en;

import React, { useState } from 'react';
import {
    Button,
    Input,
    Select,
    Modal,
    ConnectionCard,
    Toolbar,
    ToolbarSection,
    ToolbarDivider,
    ToolbarSpacer,
    SearchBar,
} from './index';
import { Plus, Play, Square, Search, Database, Lock } from 'lucide-react';

/**
 * Design System Showcase
 * Demonstrates all TablePlus-style components
 */
export default function DesignSystemShowcase() {
    const [modalOpen, setModalOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('postgres');

    return (
        <div className="min-h-screen bg-[var(--color-bg)] p-8">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-semibold text-[var(--color-text)] mb-2">
                        TablePlus Design System
                    </h1>
                    <p className="text-[var(--color-text-muted)]">
                        Clean, minimal, macOS-native components for Database Client
                    </p>
                </div>

                {/* Buttons */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Buttons
                    </h2>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Button variant="primary">Primary Button</Button>
                            <Button variant="secondary">Secondary Button</Button>
                            <Button variant="ghost">Ghost Button</Button>
                            <Button variant="danger">Danger Button</Button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button variant="primary" size="sm">
                                Small
                            </Button>
                            <Button variant="primary" size="md">
                                Medium
                            </Button>
                            <Button variant="primary" size="lg">
                                Large
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button variant="primary" icon={<Plus size={16} />}>
                                With Icon
                            </Button>
                            <Button variant="primary" loading>
                                Loading...
                            </Button>
                            <Button variant="primary" disabled>
                                Disabled
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Inputs */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Inputs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                        <Input
                            label="Database Name"
                            placeholder="Enter database name..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />

                        <Input
                            label="Host"
                            placeholder="localhost"
                            helperText="Default: localhost:5432"
                        />

                        <Input
                            label="Search"
                            leftIcon={<Search size={16} />}
                            placeholder="Search tables..."
                        />

                        <Input
                            label="Password"
                            type="password"
                            rightIcon={<Lock size={16} />}
                            placeholder="Enter password..."
                        />

                        <Input
                            label="Port"
                            error="Invalid port number"
                            value="invalid"
                        />
                    </div>
                </section>

                {/* Select */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Select Dropdown
                    </h2>
                    <div className="max-w-xs">
                        <Select
                            value={selectValue}
                            onChange={setSelectValue}
                            options={[
                                { value: 'postgres', label: 'PostgreSQL', icon: <Database size={16} /> },
                                { value: 'mysql', label: 'MySQL', icon: <Database size={16} /> },
                                { value: 'sqlite', label: 'SQLite', icon: <Database size={16} /> },
                                { value: 'mongodb', label: 'MongoDB', icon: <Database size={16} /> },
                            ]}
                            searchable
                        />
                    </div>
                </section>

                {/* SearchBar */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Search Bar
                    </h2>
                    <div className="max-w-md">
                        <SearchBar
                            value={searchValue}
                            onChange={setSearchValue}
                            placeholder="Search connections..."
                        />
                    </div>
                </section>

                {/* Toolbar */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Toolbar
                    </h2>
                    <Toolbar>
                        <ToolbarSection>
                            <Button variant="primary" icon={<Play size={16} />} size="sm">
                                Run
                            </Button>
                            <Button variant="secondary" icon={<Square size={16} />} size="sm">
                                Stop
                            </Button>
                        </ToolbarSection>

                        <ToolbarDivider />

                        <ToolbarSection>
                            <SearchBar
                                value={searchValue}
                                onChange={setSearchValue}
                                placeholder="Search..."
                            />
                        </ToolbarSection>

                        <ToolbarSpacer />

                        <ToolbarSection>
                            <Button variant="ghost" size="sm">
                                Export
                            </Button>
                        </ToolbarSection>
                    </Toolbar>
                </section>

                {/* Connection Cards */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Connection Cards
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                        <ConnectionCard
                            name="Production Database"
                            type="postgres"
                            host="prod.example.com:5432"
                            database="myapp_production"
                            lastConnected="2 hours ago"
                            onClick={() => console.log('Connect to prod')}
                        />

                        <ConnectionCard
                            name="Development DB"
                            type="mysql"
                            host="localhost:3306"
                            database="myapp_dev"
                            lastConnected="5 minutes ago"
                            onClick={() => console.log('Connect to dev')}
                        />

                        <ConnectionCard
                            name="Local SQLite"
                            type="sqlite"
                            database="/path/to/database.db"
                            lastConnected="Yesterday"
                            onClick={() => console.log('Connect to sqlite')}
                        />

                        <ConnectionCard
                            name="MongoDB Cluster"
                            type="mongodb"
                            host="cluster.mongodb.net"
                            database="analytics"
                            lastConnected="1 week ago"
                            onClick={() => console.log('Connect to mongo')}
                        />
                    </div>
                </section>

                {/* Modal */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Modal
                    </h2>
                    <Button variant="primary" onClick={() => setModalOpen(true)}>
                        Open Modal
                    </Button>

                    <Modal
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        title="Add New Connection"
                        size="md"
                        footer={
                            <>
                                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" onClick={() => setModalOpen(false)}>
                                    Save Connection
                                </Button>
                            </>
                        }
                    >
                        <div className="space-y-4">
                            <Input
                                label="Connection Name"
                                placeholder="My Database"
                                fullWidth
                            />

                            <Select
                                value={selectValue}
                                onChange={setSelectValue}
                                options={[
                                    { value: 'postgres', label: 'PostgreSQL' },
                                    { value: 'mysql', label: 'MySQL' },
                                    { value: 'sqlite', label: 'SQLite' },
                                ]}
                            />

                            <Input label="Host" placeholder="localhost" fullWidth />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Port" placeholder="5432" />
                                <Input label="Database" placeholder="mydb" />
                            </div>

                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                fullWidth
                            />
                        </div>
                    </Modal>
                </section>

                {/* Color Palette */}
                <section>
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                        Color Palette
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <div
                                className="h-20 rounded-md mb-2"
                                style={{ backgroundColor: 'var(--accent-blue)' }}
                            />
                            <p className="text-sm text-[var(--color-text)]">Blue</p>
                            <p className="text-xs text-[var(--color-text-muted)]">#039BE5</p>
                        </div>

                        <div>
                            <div
                                className="h-20 rounded-md mb-2"
                                style={{ backgroundColor: 'var(--accent-green)' }}
                            />
                            <p className="text-sm text-[var(--color-text)]">Green</p>
                            <p className="text-xs text-[var(--color-text-muted)]">#43A047</p>
                        </div>

                        <div>
                            <div
                                className="h-20 rounded-md mb-2"
                                style={{ backgroundColor: 'var(--accent-orange)' }}
                            />
                            <p className="text-sm text-[var(--color-text)]">Orange</p>
                            <p className="text-xs text-[var(--color-text-muted)]">#F57C00</p>
                        </div>

                        <div>
                            <div
                                className="h-20 rounded-md mb-2"
                                style={{ backgroundColor: 'var(--accent-yellow)' }}
                            />
                            <p className="text-sm text-[var(--color-text)]">Yellow</p>
                            <p className="text-xs text-[var(--color-text-muted)]">#FFB300</p>
                        </div>

                        <div>
                            <div
                                className="h-20 rounded-md mb-2"
                                style={{ backgroundColor: 'var(--accent-red)' }}
                            />
                            <p className="text-sm text-[var(--color-text)]">Red</p>
                            <p className="text-xs text-[var(--color-text-muted)]">#E53935</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
